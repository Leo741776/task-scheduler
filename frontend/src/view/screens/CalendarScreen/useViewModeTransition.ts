import { useCallback, useRef, useState } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { ViewMode } from '../../../viewmodel/stores/calendarStore';

const LEVELS: Record<ViewMode, number> = { monthly: 0, weekly: 1, daily: 2 };

const TOTAL_MS = 220;
const HALF_MS = TOTAL_MS / 2;

// Bigger delta on a two-level jump so the same duration looks faster.
const PEAK_DOWN_ONE = 1.5;
const PEAK_DOWN_TWO = 2.5;
const PEAK_UP_ONE = 0.66;
const PEAK_UP_TWO = 0.4;

export function useViewModeTransition(
  viewMode: ViewMode,
  setViewMode: (m: ViewMode) => void
) {
  const progress = useSharedValue(1);
  const direction = useSharedValue(1);
  const magnitude = useSharedValue(1);
  const animatingRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const clearAnimating = useCallback(() => {
    animatingRef.current = false;
    setIsTransitioning(false);
  }, []);

  const transitionTo = useCallback(
    (target: ViewMode) => {
      if (target === viewMode) return;
      if (animatingRef.current) return;
      animatingRef.current = true;
      setIsTransitioning(true);

      const delta = LEVELS[target] - LEVELS[viewMode];
      direction.value = delta > 0 ? 1 : -1;
      magnitude.value = Math.abs(delta);

      const startInPhase = () => {
        setViewMode(target);
        progress.value = withTiming(
          1,
          { duration: HALF_MS, easing: Easing.in(Easing.cubic) },
          (done) => {
            'worklet';
            if (done) runOnJS(clearAnimating)();
          }
        );
      };

      progress.value = 0;
      progress.value = withTiming(
        0.5,
        { duration: HALF_MS, easing: Easing.out(Easing.cubic) },
        (done) => {
          'worklet';
          if (done) runOnJS(startInPhase)();
        }
      );
    },
    [viewMode, setViewMode, clearAnimating, direction, magnitude, progress]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const peakDown = magnitude.value === 2 ? PEAK_DOWN_TWO : PEAK_DOWN_ONE;
    const peakUp = magnitude.value === 2 ? PEAK_UP_TWO : PEAK_UP_ONE;
    const outgoingPeak = direction.value === 1 ? peakDown : peakUp;
    const incomingStart = direction.value === 1 ? peakUp : peakDown;

    let opacity = 1;
    let scale = 1;
    if (progress.value < 0.5) {
      const t = progress.value / 0.5;
      opacity = 1 - t;
      scale = 1 + (outgoingPeak - 1) * t;
    } else if (progress.value < 1) {
      const t = (progress.value - 0.5) / 0.5;
      opacity = t;
      scale = incomingStart + (1 - incomingStart) * t;
    }
    return { opacity, transform: [{ scale }] };
  });

  return { animatedStyle, transitionTo, isTransitioning };
}
