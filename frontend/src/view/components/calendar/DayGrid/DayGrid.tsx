import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  PINCH_IN_THRESHOLD,
  PINCH_OUT_THRESHOLD,
  LARGE_PINCH_IN_THRESHOLD,
  LARGE_PINCH_OUT_THRESHOLD,
  PINCH_RESET_HIGH,
  PINCH_RESET_LOW,
} from '../pinchThresholds';
import { AppColors, useTheme } from '../../../../nativeTheme';
import { formatHourLabel } from '../../../../utils/format';
import type { Task } from '../../../../viewmodel/hooks/useTasks';
import type {
  RenderHeaderCtx,
  RenderDayColumnCtx,
  ViewportStartFor,
} from './dayGridTypes';

// Imperative methods called by CalendarScreen to trigger recenter and vertical scroll.
export interface DayGridHandle {
  recenter: () => void;
  scrollToHour: (hour: number) => void;
}

const WINDOW_HALF_DAYS = 90;
const EXTEND_BATCH = 30;

// Must equal EXTEND_BATCH. Smaller values cause blank-column flashes during backward extension.
const PADDING_COLS = EXTEND_BATCH;
// Column drift before the mounted slice is recomputed.
const RECOMPUTE_MARGIN_COLS = 7;
// Columns from either edge at which extension fires. Must be < PADDING_COLS.
const EDGE_TRIGGER_COLS = 3;
const MIN_HOUR_ROW_H = 32.25;
const MAX_HOUR_ROW_H = 193.3;
export const TIME_AXIS_W = 45;
export const DAY_HEADER_H = 60;

const SNAP_DURATION_MS = 180;
const SNAP_BIAS = 0.35;
const RECENTER_DURATION_MS = 250;
const MAX_RECENTER_ANIM_DAYS = 28;

// Finger velocity above which it advances one extra column.
const FLICK_VELOCITY_THRESHOLD_PX_PER_S = 600;

interface Props {
  selectedDay: Date;
  tasks: Task[];
  visibleCols: number;
  viewportStartFor: ViewportStartFor;
  renderHeader: (ctx: RenderHeaderCtx) => React.ReactNode;
  renderDayColumn: (ctx: RenderDayColumnCtx) => React.ReactNode;
  // False while Monthly is overlaid. Engine stays mounted.
  active?: boolean;
  // Called on pan-end snap with the leftmost-visible date. Not called on imperative viewport moves.
  onViewportSettled?: (date: Date) => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onLargePinchIn?: () => void;
  onLargePinchOut?: () => void;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

//
function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function buildWindow(anchor: Date): Date[] {
  const center = startOfDay(anchor);
  const out: Date[] = [];
  for (let i = -WINDOW_HALF_DAYS; i <= WINDOW_HALF_DAYS; i++) {
    out.push(addDays(center, i));
  }
  return out;
}

function findDayIndex(data: Date[], d: Date): number {
  return data.findIndex((x) => isSameDay(x, d));
}

const DayGrid = forwardRef<DayGridHandle, Props>(function DayGrid({
  selectedDay,
  tasks,
  visibleCols,
  viewportStartFor,
  renderHeader,
  renderDayColumn,
  onViewportSettled,
  onPinchIn,
  onPinchOut,
  onLargePinchIn,
  onLargePinchOut,
  active = true,
}, ref) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  // Hour row height in px. Local so it survives mode switches.
  const [hourRowH, setHourRowH] = useState(120);

  const [now, setNow] = useState(() => new Date());
  const timeoutCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());

    update();

    // Align the first tick close to the next minute, then update every minute.
    const msUntilNextMinute =
      60_000 - (Date.now() % 60_000);

    const timeoutId = setTimeout(() => {
      update();
      const intervalId = setInterval(update, 60_000);

      // Store interval cleanup on the timeout object scope.
      timeoutCleanupRef.current = () => clearInterval(intervalId);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeoutId);
      timeoutCleanupRef.current?.();
      timeoutCleanupRef.current = null;
    };
  }, []);

  // UI-thread mirror of hourRowH. Only this updates during the drag gesture, driving
  // animated heights without React re-renders. Commits to Zustand once on gesture end.
  const hourRowHShared = useSharedValue(hourRowH);
  const hourRowHStart = useSharedValue(hourRowH);
  useEffect(() => {
    hourRowHShared.value = hourRowH;
  }, [hourRowH, hourRowHShared]);

  // panX: horizontal content offset in px, written by bodyPanGesture on the UI thread.
  // panXStart: panX snapshot at gesture start so onUpdate can use absolute translationX math.
  // maxPanX: upper clamp kept as a shared value so worklets can read it without going through JS.
  const panX = useSharedValue(0);
  const panXStart = useSharedValue(0);
  const maxPanX = useSharedValue(0);

  // Layout gate. Stays false until the positioning useLayoutEffect writes panX and seeds
  // renderRange. Flips inside useLayoutEffect so the first visible render has correct position.
  const [isPositioned, setIsPositioned] = useState(false);

  // Mounted [start, end) slice of dayData. React state since it controls tree children.
  // Lazy-initialized so the first render has a non-empty slice, avoiding a blank frame before layout.
  const [renderRange, setRenderRange] = useState<{ start: number; end: number }>(() => {
    const initialData = buildWindow(selectedDay);
    const rawStart = viewportStartFor(selectedDay, initialData);
    const startIdx = Math.max(0, rawStart);
    return {
      start: Math.max(0, startIdx - PADDING_COLS),
      end: Math.min(initialData.length, startIdx + visibleCols + PADDING_COLS),
    };
  });
  const lastCommittedFirstVisibleIdx = useSharedValue(0);

  // windowAnchor is bumped only on reanchor, not on extensions, so effects
  // that depend on it don't fire on every data extension.
  const [dayData, setDayData] = useState<Date[]>(() => buildWindow(selectedDay));
  const [windowAnchor, setWindowAnchor] = useState<Date>(() => selectedDay);

  // Updated synchronously before every setDayData call. A runOnJS(recomputeRenderRange)
  // can fire before the commit with a stale dayData.length closure; reading from this ref
  // avoids clamping renderRange.end below the newly-extended region.
  const dayDataLengthRef = useRef(dayData.length);
  dayDataLengthRef.current = dayData.length;

  // Re-synced every render so dispatchSettled (stable, empty deps) always reads
  // the latest values without causing bodyPanGesture to rebuild.
  const dayDataRef = useRef(dayData);
  dayDataRef.current = dayData;
  const onViewportSettledRef = useRef<((d: Date) => void) | undefined>(onViewportSettled);
  onViewportSettledRef.current = onViewportSettled;

  // Stable (empty deps) so it can appear in gesture deps without causing rebuilds.
  const dispatchSettled = useCallback((idx: number) => {
    const cb = onViewportSettledRef.current;
    if (!cb) return;
    const d = dayDataRef.current[idx];
    if (d) cb(d);
  }, []);

  const reanchor = useCallback((newAnchor: Date) => {
    const nextData = buildWindow(newAnchor);
    dayDataLengthRef.current = nextData.length;
    setDayData(nextData);
    setWindowAnchor(newAnchor);
  }, []);

  // Dedupes extension calls. useAnimatedReaction fires per frame at the edge,
  // so without this a single drag would enqueue many setDayData calls.
  const lastExtendAtRef = useRef(0);
  const EXTEND_COOLDOWN_MS = 250;

  const extendForward = useCallback(() => {
    const now = Date.now();
    if (now - lastExtendAtRef.current < EXTEND_COOLDOWN_MS) return;
    lastExtendAtRef.current = now;
    // Must precede setDayData so stale-closure recomputes read the updated length.
    dayDataLengthRef.current += EXTEND_BATCH;
    setDayData((prev) => {
      const last = prev[prev.length - 1];
      const toAppend: Date[] = [];
      for (let i = 1; i <= EXTEND_BATCH; i++) toAppend.push(addDays(last, i));
      return [...prev, ...toAppend];
    });
    // Widen in the same batch so new days are mounted before the user pans into them.
    setRenderRange((r) => ({
      start: r.start,
      end: r.end + EXTEND_BATCH,
    }));
  }, []);

  // Prepending shifts every existing index by +EXTEND_BATCH. The panX shift
  // happens in the useLayoutEffect below after React commits, to avoid a frame
  // with new panX against old dayData. r.start is not shifted because
  // extendBackward only fires when firstVisible <= EDGE_TRIGGER_COLS, so
  // r.start is already 0 and bumping only end covers both the prepended and
  // shifted regions.
  const prependPendingRef = useRef(0);
  const extendBackward = useCallback(() => {
    const now = Date.now();
    if (now - lastExtendAtRef.current < EXTEND_COOLDOWN_MS) return;
    lastExtendAtRef.current = now;
    prependPendingRef.current += EXTEND_BATCH;
    // Same rationale as extendForward.
    dayDataLengthRef.current += EXTEND_BATCH;
    setDayData((prev) => {
      const first = prev[0];
      const toPrepend: Date[] = [];
      for (let i = EXTEND_BATCH; i >= 1; i--) toPrepend.push(addDays(first, -i));
      return [...toPrepend, ...prev];
    });
    setRenderRange((r) => ({
      start: r.start,
      end: r.end + EXTEND_BATCH,
    }));
  }, []);

  // Floor so flex row widths and absolute positions stay integer-aligned.
  const dayColW =
    containerWidth > 0 ? Math.floor((containerWidth - TIME_AXIS_W) / visibleCols) : 0;

  // Shifts panX after React commits the prepend. cancelAnimation is needed
  // because an in-flight withTiming target would drive panX back to the pre-shift value.
  useLayoutEffect(() => {
    if (prependPendingRef.current <= 0 || dayColW === 0) return;
    const shiftCols = prependPendingRef.current;
    const shiftPx = shiftCols * dayColW;
    cancelAnimation(panX);
    const shifted = panX.value + shiftPx;
    panX.value = shifted;
    panXStart.value = panXStart.value + shiftPx;
    lastCommittedFirstVisibleIdx.value =
      lastCommittedFirstVisibleIdx.value + shiftCols;
    prependPendingRef.current = 0;
    const maxIdx = Math.floor(maxPanX.value / dayColW);
    // Symmetric round, not SNAP_BIAS: this is a coord-space fix after prepend, not a user gesture.
    const idx = Math.max(0, Math.min(maxIdx, Math.round(shifted / dayColW)));
    const target = idx * dayColW;
    if (target !== shifted) {
      panX.value = withTiming(target, {
        duration: SNAP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayData.length, dayColW]);

  useEffect(() => {
    maxPanX.value = Math.max(0, (dayData.length - visibleCols) * dayColW);
  }, [dayData.length, dayColW, visibleCols, maxPanX]);

  const outerRowAnimatedStyle = useAnimatedStyle(() => ({
    height: 24 * hourRowHShared.value,
  }));

  const vertScrollRef = useRef<ScrollView>(null);

  const [viewportH, setViewportH] = useState(0);
  const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportH(e.nativeEvent.layout.height);
  }, []);

  // Stored as a fractional hour so it survives hourRowH rescales. Initialized to now.
  const [scrollHour, setScrollHour] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  // Passed as contentOffset so the ScrollView mounts pre-scrolled. useState
  // runs the pixel math once at mount and prevents re-runs on re-renders.
  const [initialScrollOffsetY] = useState(() => scrollHour * hourRowH);

  // Clamps scrollHour when the viewport or row height shrinks so stored
  // position stays reachable. Uses a ref so this effect only fires on
  // viewportH/hourRowH changes, not every scroll tick.
  const scrollHourRef = useRef(scrollHour);
  scrollHourRef.current = scrollHour;
  useLayoutEffect(() => {
    if (viewportH <= 0 || hourRowH <= 0) return;
    const contentH = 24 * hourRowH;
    const maxY = Math.max(0, contentH - viewportH);
    const maxHour = maxY / hourRowH;
    if (scrollHourRef.current > maxHour + 0.001) {
      setScrollHour(maxHour);
      vertScrollRef.current?.scrollTo({ y: maxY, animated: false });
    }
  }, [viewportH, hourRowH]);

  // Rebuilds dayData when selectedDay leaves the window. When active, reanchors
  // immediately. When hidden, trailing-edge debounces so rapid Monthly taps
  // batch into one reanchor.
  const hiddenReanchorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HIDDEN_REANCHOR_DEBOUNCE_MS = 120;
  useEffect(() => {
    if (hiddenReanchorTimerRef.current !== null) {
      clearTimeout(hiddenReanchorTimerRef.current);
      hiddenReanchorTimerRef.current = null;
    }
    if (findDayIndex(dayData, selectedDay) !== -1) return;
    if (active) {
      reanchor(selectedDay);
      return;
    }
    const target = selectedDay;
    hiddenReanchorTimerRef.current = setTimeout(() => {
      hiddenReanchorTimerRef.current = null;
      reanchor(target);
    }, HIDDEN_REANCHOR_DEBOUNCE_MS);
  }, [selectedDay, dayData, active, reanchor]);

  useEffect(
    () => () => {
      if (hiddenReanchorTimerRef.current !== null) {
        clearTimeout(hiddenReanchorTimerRef.current);
        hiddenReanchorTimerRef.current = null;
      }
    },
    []
  );

  // On hidden->active, flush any pending debounce and reanchor if needed so the
  // initial render has correct dayData. On active->hidden, cancel in-flight
  // panX animations so they don't drift under Monthly.
  const prevActiveRef = useRef(active);
  useLayoutEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;
    if (wasActive === active) return;
    if (active) {
      if (hiddenReanchorTimerRef.current !== null) {
        clearTimeout(hiddenReanchorTimerRef.current);
        hiddenReanchorTimerRef.current = null;
      }
      if (findDayIndex(dayData, selectedDay) === -1) {
        reanchor(selectedDay);
      }
      // In-window: the positioning effect below re-runs via its active dep.
    } else {
      cancelAnimation(panX);
    }
  }, [active, selectedDay, dayData, reanchor, panX]);

  // Teleports panX and seeds renderRange on mount, reanchor, mode switch, or
  // dayColW change. selectedDay and dayData intentionally omitted: the viewport
  // only moves on explicit navigation (recenter handle) or reanchor, not on
  // every selection change or extension.
  useLayoutEffect(() => {
    if (dayColW === 0) return;
    const startIdx = viewportStartFor(selectedDay, dayData);
    if (startIdx < 0) return;
    panX.value = startIdx * dayColW;
    lastCommittedFirstVisibleIdx.value = startIdx;
    setRenderRange({
      start: Math.max(0, startIdx - PADDING_COLS),
      end: Math.min(dayData.length, startIdx + visibleCols + PADDING_COLS),
    });
    if (!isPositioned) setIsPositioned(true);
    // selectedDay, dayData, viewportStartFor, isPositioned intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowAnchor, visibleCols, dayColW, active]);

  // Uses dayDataLengthRef instead of closing over dayData.length so the callback
  // stays stable and useAnimatedReaction does not re-register on every extension.
  const recomputeRenderRange = useCallback(
    (firstVisible: number) => {
      setRenderRange({
        start: Math.max(0, firstVisible - PADDING_COLS),
        end: Math.min(
          dayDataLengthRef.current,
          firstVisible + visibleCols + PADDING_COLS
        ),
      });
    },
    [visibleCols]
  );

  useAnimatedReaction(
    () => panX.value,
    (current) => {
      'worklet';
      if (dayColW <= 0) return;
      const firstVisible = Math.floor(current / dayColW);

      if (
        Math.abs(firstVisible - lastCommittedFirstVisibleIdx.value) >=
        RECOMPUTE_MARGIN_COLS
      ) {
        lastCommittedFirstVisibleIdx.value = firstVisible;
        runOnJS(recomputeRenderRange)(firstVisible);
      }

      const edgePx = EDGE_TRIGGER_COLS * dayColW;
      if (current < edgePx) {
        runOnJS(extendBackward)();
      } else if (maxPanX.value - current < edgePx) {
        runOnJS(extendForward)();
      }
    },
    [dayColW, recomputeRenderRange, extendForward, extendBackward]
  );

  // Runtime scroll target set by scrollToHour(). Local state so it batches with setSelectedDay.
  const [pendingScrollHour, setPendingScrollHour] = useState<number | null>(null);

  // Monotonic counter bumped by recenter(). Consumed-ref pattern ignores the
  // initial value so mount does not auto-fire a recenter.
  const [recenterTick, setRecenterTick] = useState(0);

  // Clamps the scroll target to the reachable range and waits for viewportH before firing.
  useEffect(() => {
    if (pendingScrollHour == null) return;
    if (viewportH <= 0 || hourRowH <= 0) return;
    const contentH = 24 * hourRowH;
    const maxY = Math.max(0, contentH - viewportH);
    const targetY = Math.min(Math.max(0, pendingScrollHour * hourRowH), maxY);
    vertScrollRef.current?.scrollTo({ y: targetY, animated: true });
    setScrollHour(targetY / hourRowH);
    setPendingScrollHour(null);
  }, [pendingScrollHour, viewportH, hourRowH]);

  const onVertScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (hourRowH === 0) return;
      setScrollHour(e.nativeEvent.contentOffset.y / hourRowH);
    },
    [setScrollHour, hourRowH]
  );

  const onLayoutRoot = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Out-of-window: reanchor, then the positioning effect teleports panX.
  // In-window: animate with withTiming.
  const onRecenter = useCallback(() => {
    if (dayColW === 0) return;
    const startIdx = viewportStartFor(selectedDay, dayData);
    if (startIdx < 0) {
      reanchor(selectedDay);
      return;
    }

    const currentIdx = Math.round(panX.value / dayColW);
    const distanceDays = Math.abs(startIdx - currentIdx);
    const target = startIdx * dayColW;

    if (distanceDays > MAX_RECENTER_ANIM_DAYS) {
      cancelAnimation(panX)
      panX.value = target;
      lastCommittedFirstVisibleIdx.value = startIdx;
      recomputeRenderRange(startIdx)
      return;
    }

    panX.value = withTiming(startIdx * dayColW, {
      duration: RECENTER_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [dayColW, dayData, selectedDay, reanchor, panX, viewportStartFor, recomputeRenderRange, lastCommittedFirstVisibleIdx,]);

  // useLayoutEffect so reanchor lands before the initial render when
  // recenter() is called together with a far-jump setSelectedDay.
  const consumedRecenterRef = useRef(recenterTick);
  useLayoutEffect(() => {
    if (recenterTick === consumedRecenterRef.current) return;
    consumedRecenterRef.current = recenterTick;
    onRecenter();
  }, [recenterTick, onRecenter]);

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => setRecenterTick((t) => t + 1),
      scrollToHour: (h) => setPendingScrollHour(h),
    }),
    []
  );

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const verticalNativeGesture = useMemo(() => Gesture.Native(), []);

  // Runs on the UI thread, writing hourRowHShared each frame. Commits to Zustand once on end.
  const timeAxisPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .blocksExternalGesture(verticalNativeGesture)
        .onStart(() => {
          'worklet';
          hourRowHStart.value = hourRowHShared.value;
        })
        .onUpdate((e) => {
          'worklet';
          const next = Math.max(
            MIN_HOUR_ROW_H,
            Math.min(MAX_HOUR_ROW_H, hourRowHStart.value + e.translationY)
          );
          hourRowHShared.value = next;
        })
        .onEnd(() => {
          'worklet';
          runOnJS(setHourRowH)(hourRowHShared.value);
        }),
    [verticalNativeGesture, setHourRowH, hourRowHShared, hourRowHStart]
  );

  // Writes panX on the UI thread. activeOffsetX prevents stealing taps;
  // failOffsetY lets diagonal drags fall through to the vertical ScrollView.
  // dayColW must be in deps since worklets close over it.
  const bodyPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .blocksExternalGesture(verticalNativeGesture)
        .onStart(() => {
          'worklet';
          panXStart.value = panX.value;
        })
        .onUpdate((e) => {
          'worklet';
          const next = panXStart.value - e.translationX;
          panX.value = Math.max(0, Math.min(maxPanX.value, next));
        })
        .onEnd((e) => {
          'worklet';
          // Direction-aware position bias plus optional flick offset.
          if (dayColW <= 0) return;
          const maxIdx = Math.floor(maxPanX.value / dayColW);
          const ratio = panX.value / dayColW;
          const floor = Math.floor(ratio);
          const frac = ratio - floor;
          // delta > 0 (panned forward): commit to floor+1 past SNAP_BIAS.
          // delta < 0 (panned backward): commit to floor past 1-SNAP_BIAS.
          // Zero delta: use 0.5 midpoint.
          const delta = panX.value - panXStart.value;
          let biased: number;
          if (delta > 0) {
            biased = frac > SNAP_BIAS ? floor + 1 : floor;
          } else if (delta < 0) {
            biased = frac < 1 - SNAP_BIAS ? floor : floor + 1;
          } else {
            biased = frac >= 0.5 ? floor + 1 : floor;
          }
          // velocityX is finger velocity; panX grows opposite to finger motion, so sign is flipped.
          if (Math.abs(e.velocityX) > FLICK_VELOCITY_THRESHOLD_PX_PER_S) {
            biased += e.velocityX > 0 ? -1 : 1;
          }
          const idx = Math.max(0, Math.min(maxIdx, biased));
          const target = idx * dayColW;
          panX.value = withTiming(target, {
            duration: SNAP_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          });
          // Only emitted on pan-end, not on imperative moves, to avoid feedback loops.
          runOnJS(dispatchSettled)(idx);
        }),
    [verticalNativeGesture, panX, panXStart, maxPanX, dayColW, dispatchSettled]
  );

  // Fires once per large-band crossing. Reset by onStart and by re-entering
  // the neutral scale band mid-gesture so a deliberate relax-and-re-pinch can re-fire.
  const largeHapticFiredRef = useRef(false);

  // Declared after bodyPanGesture so it can list it in simultaneousWithExternalGesture,
  // allowing a pinch to fire while a horizontal pan is active or still settling.
  // Large scale bands take priority over normal; if the large callback is absent,
  // falls through to the normal band. Haptic fires once per large-band crossing
  // when the matching callback is defined.
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .simultaneousWithExternalGesture(
          verticalNativeGesture,
          bodyPanGesture,
          timeAxisPanGesture
        )
        .onStart(() => {
          setScrollEnabled(false);
          largeHapticFiredRef.current = false;
        })
        .onUpdate((e) => {
          if (!largeHapticFiredRef.current) {
            const crossedIn =
              e.scale >= LARGE_PINCH_IN_THRESHOLD && !!onLargePinchIn;
            const crossedOut =
              e.scale <= LARGE_PINCH_OUT_THRESHOLD && !!onLargePinchOut;
            if (crossedIn || crossedOut) {
              largeHapticFiredRef.current = true;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {}
              );
            }
          } else if (
            e.scale < PINCH_RESET_HIGH &&
            e.scale > PINCH_RESET_LOW
          ) {
            largeHapticFiredRef.current = false;
          }
        })
        .onEnd((e, success) => {
          setScrollEnabled(true);
          if (!success) return;
          if (e.scale >= LARGE_PINCH_IN_THRESHOLD && onLargePinchIn) {
            onLargePinchIn();
          } else if (
            e.scale <= LARGE_PINCH_OUT_THRESHOLD &&
            onLargePinchOut
          ) {
            onLargePinchOut();
          } else if (e.scale > PINCH_IN_THRESHOLD && onPinchIn) {
            onPinchIn();
          } else if (e.scale < PINCH_OUT_THRESHOLD && onPinchOut) {
            onPinchOut();
          }
        }),
    [
      onPinchIn,
      onPinchOut,
      onLargePinchIn,
      onLargePinchOut,
      verticalNativeGesture,
      bodyPanGesture,
      timeAxisPanGesture,
      setScrollEnabled,
    ]
  );

  const bodyRowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -panX.value }],
  }));

  // Separate from bodyRowAnimatedStyle so header and body can be offset independently.
  const headerRowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -panX.value }],
  }));

  const headerCtx: RenderHeaderCtx = {
    dayData,
    renderRange,
    dayColW,
    selectedDay,
    headerRowAnimatedStyle,
    isPositioned,
    timeAxisWidth: TIME_AXIS_W,
    dayHeaderHeight: DAY_HEADER_H,
    active,
  };

  const nowTop = (minutesSinceMidnight(now) / 60) * hourRowH;

  return (
    <GestureDetector gesture={pinchGesture}>
    <View style={styles.root} onLayout={onLayoutRoot}>
      {renderHeader(headerCtx)}

      {/* Non-scrolling backdrop for the time-axis lane. Without this, overscrolling
       * above/below the 24*hourRowH content exposes colors.bg in the time-axis column. */}
      <View style={styles.timeAxisLaneBg} pointerEvents="none" />

      <GestureDetector gesture={verticalNativeGesture}>
        <ScrollView
          ref={vertScrollRef}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onScroll={onVertScroll}
          scrollEventThrottle={100}
          style={styles.contentScroll}
          contentOffset={{ x: 0, y: initialScrollOffsetY }}
          onLayout={onScrollViewLayout}
        >
          <Reanimated.View style={[{ flexDirection: 'row' }, outerRowAnimatedStyle]}>
            <GestureDetector gesture={timeAxisPanGesture}>
              <View style={[styles.timeAxis, { width: TIME_AXIS_W, height: '100%' }]}>
                {/* Closes the 12AM/11PM boundaries without boxing the full lane. */}
                <View style={[styles.timeEdgeTick, { top: -1 }]} pointerEvents="none" />
                {hours.map((h) => (
                  <View
                    key={h}
                    style={[
                      styles.timeTick,
                      {
                        top: `${(h / 24) * 100}%`,
                        height: `${100 / 24}%`,
                      },
                      // Drop the last tick's border so it doesn't stack with
                      // the bottom edge tick below.
                      h === 23 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {h < 23 && (
                      <Text style={styles.timeTickLabel}>{formatHourLabel(h + 1)}</Text>
                    )}
                  </View>
                ))}
                <View style={[styles.timeEdgeTick, { bottom: -1 }]} pointerEvents="none" />
              </View>
            </GestureDetector>

            {dayColW > 0 && isPositioned && active && (
              // Outer View clips and handles the pan gesture. Inner Reanimated.View is the
              // full virtual row; only the windowed slice is mounted, each child absolutely
              // positioned so translateX lands the right columns at the viewport.
              <GestureDetector gesture={bodyPanGesture}>
                <View style={[styles.bodyList, styles.bodyListClip]}>
                  <Reanimated.View
                    style={[
                      {
                        width: dayData.length * dayColW,
                        height: '100%',
                      },
                      bodyRowAnimatedStyle,
                    ]}
                  >
                    {dayData
                      .slice(renderRange.start, renderRange.end)
                      .map((d, i) => {
                        const absIndex = renderRange.start + i;
                        return (
                          <View
                            key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                            style={{
                              position: 'absolute',
                              left: absIndex * dayColW,
                              top: 0,
                              width: dayColW,
                              height: '100%',
                            }}
                          >
                            {renderDayColumn({
                              date: d,
                              isSelected: isSameDay(d, selectedDay),
                              dayColW,
                              tasks,
                              absIndex,
                            })}

                            {isSameDay(d, now) && (
                              <View
                                pointerEvents="none"
                                style={[
                                  styles.nowLine,
                                  {
                                    top: nowTop,
                                  },
                                ]}
                              >
                                <View style={styles.nowDot} />
                                <View style={styles.nowBar} />
                              </View>
                            )}
                          </View>
                        );
                      })}
                  </Reanimated.View>
                </View>
              </GestureDetector>
            )}
          </Reanimated.View>
        </ScrollView>
      </GestureDetector>

      {/* Non-scrolling overlay that draws column dividers across the full viewport height,
       * including the overscroll void where hourCell.borderRight does not exist.
       * The container sits 1px left of the day area so the seam pixel is covered;
       * line positions are shifted +1 to compensate. Reuses bodyRowAnimatedStyle
       * so dividers track panX on the UI thread. */}
      {active && isPositioned && dayColW > 0 && (
        <View style={styles.vDividersOverlay} pointerEvents="none">
          <Reanimated.View
            style={[
              {
                width: dayData.length * dayColW,
                height: '100%',
              },
              bodyRowAnimatedStyle,
            ]}
          >
            {dayData.slice(renderRange.start, renderRange.end).map((d, i) => {
              const absIndex = renderRange.start + i;
              return (
                <View
                  key={`vdiv-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                  style={[
                    styles.vDivider,
                    { left: (absIndex + 1) * dayColW },
                  ]}
                />
              );
            })}
          </Reanimated.View>
        </View>
      )}

      {/* Accent-colored left and right borders around the selected column.
       * Only shown when visibleCols > 1; in Daily mode the whole viewport is the selected day. */}
      {active && isPositioned && dayColW > 0 && visibleCols > 1 && (() => {
        const selectedAbsIndex = findDayIndex(dayData, selectedDay);
        if (selectedAbsIndex < 0) return null;
        return (
          <View style={styles.vDividersOverlay} pointerEvents="none">
            <Reanimated.View
              style={[
                {
                  width: dayData.length * dayColW,
                  height: '100%',
                },
                bodyRowAnimatedStyle,
              ]}
            >
              <View
                style={[
                  styles.vDividerSelected,
                  { left: selectedAbsIndex * dayColW },
                ]}
              />
              <View
                style={[
                  styles.vDividerSelected,
                  { left: (selectedAbsIndex + 1) * dayColW },
                ]}
              />
            </Reanimated.View>
          </View>
        );
      })()}
    </View>
    </GestureDetector>
  );
});

export default DayGrid;

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentScroll: {
    flex: 1,
    // Lifts content 1px so the timeAxis/bodyList top borders overlap the
    // header's bottom border at y=0, reading as one line.
    marginTop: -1,
  },
  bodyList: {
    flex: 1,
    // borderSolid avoids alpha-compositing darker when stacked with the header's borderBottom.
    borderTopWidth: 1,
    borderTopColor: colors.borderSolid,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Clips the oversized inner row so off-screen columns are hidden until panX translates them in.
  bodyListClip: {
    overflow: 'hidden',
  },
  timeAxis: {
    // No backgroundColor: timeAxisLaneBg provides the backdrop. Adding one here
    // would bleed into the 1px seam row, hiding the header's bottom border in this lane.
    borderRightWidth: 1,
    borderRightColor: colors.border,
    // Transparent borders match bodyList so both lanes share the same H-2 content box
    // and hour ticks align. Visible edges come from timeEdgeTick.
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  timeTick: {
    position: 'absolute',
    left: 0,
    right: 0,
    // borderSolid avoids a darker line when a tick briefly stacks under the header during scroll.
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
  },
  // 4px inset tick closing the 12AM/11PM boundaries without a full-width border.
  timeEdgeTick: {
    position: 'absolute',
    right: 0,
    width: 4,
    height: 1,
    backgroundColor: colors.borderSolid,
  },
  timeTickLabel: {
    position: 'absolute',
    right: 4,
    bottom: -7,
    paddingHorizontal: 3,
    // backgroundColor: colors.panel,
    backgroundColor: colors.headerAxisBG,
    fontSize: 10,
    color: colors.muted,
  },
  timeAxisLaneBg: {
    position: 'absolute',
    top: DAY_HEADER_H,
    left: 0,
    width: TIME_AXIS_W,
    bottom: 0,
    // backgroundColor: colors.panel,
    backgroundColor: colors.headerAxisBG,
  },
  vDividersOverlay: {
    position: 'absolute',
    top: DAY_HEADER_H,
    // 1px left of the day area to include the seam pixel. Line positions are offset +1 to compensate.
    left: TIME_AXIS_W - 1,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  vDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.borderSolid,
  },
  vDividerSelected: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.accent,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    marginTop: -6,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#ff3b30',
  },
});
