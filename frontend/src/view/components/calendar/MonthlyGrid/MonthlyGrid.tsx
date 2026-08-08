import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import {
  PINCH_IN_THRESHOLD,
  LARGE_PINCH_IN_THRESHOLD,
  PINCH_RESET_HIGH,
  PINCH_RESET_LOW,
} from '../pinchThresholds';
import { AppColors, useTheme } from '../../../../nativeTheme';
import { getTaskPriorityDotColor } from '../../../../utils/taskPriority';
import type { Task } from '../../../../viewmodel/hooks/useTasks';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  selectedDay: Date;
  onDayPress: (date: Date) => void;
  onDayDoubleTap?: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPinchIn?: () => void;
  onLargePinchIn?: () => void; // Large pinch-in shortcut: Monthly->Daily
  tasks: Task[];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function MonthlyGrid({
  selectedDay,
  onDayPress,
  onDayDoubleTap,
  onSwipeLeft,
  onSwipeRight,
  onPinchIn,
  onLargePinchIn,
  tasks,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const lastTapRef = useRef<{ time: number; key: string } | null>(null);
  const DOUBLE_TAP_MS = 300;

  const handleDayTap = (d: Date) => {
    const now = Date.now();
    const k = dateKey(d);
    const last = lastTapRef.current;
    if (onDayDoubleTap && last && last.key === k && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onDayDoubleTap(d);
      return;
    }
    lastTapRef.current = { time: now, key: k };
    onDayPress(d);
  };
  const year = selectedDay.getFullYear();
  const month = selectedDay.getMonth();

  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startDow = firstOfMonth.getDay();
    const origin = new Date(year, month, 1 - startDow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + i);
      return { date: d, dayOfMonth: d.getDate(), isCurrentMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const taskMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task?.start) continue;
      const d = task.start instanceof Date ? task.start : new Date(task.start as string);
      const k = dateKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(task);
    }
    return map;
  }, [tasks]);

  const selectedWeekRow = useMemo(() => {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (isSameDay(grid[row * 7 + col].date, selectedDay)) return row;
      }
    }
    return -1;
  }, [grid, selectedDay]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 12,
        onPanResponderRelease: (_, gs) => {
          if (Math.abs(gs.dx) > 60) {
            if (gs.dx < 0) onSwipeLeft();
            else onSwipeRight();
          }
        },
      }),
    [onSwipeLeft, onSwipeRight]
  );

  // Big pinch on monthly zooms into daily with a haptic
  const largeHapticFiredRef = useRef(false);
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          largeHapticFiredRef.current = false;
        })
        .onUpdate((e) => {
          if (!largeHapticFiredRef.current) {
            if (e.scale >= LARGE_PINCH_IN_THRESHOLD && onLargePinchIn) {
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
        .onEnd((e) => {
          if (e.scale >= LARGE_PINCH_IN_THRESHOLD && onLargePinchIn) {
            onLargePinchIn();
          } else if (e.scale > PINCH_IN_THRESHOLD && onPinchIn) {
            onPinchIn();
          }
        }),
    [onPinchIn, onLargePinchIn]
  );

  return (
    <GestureDetector gesture={pinchGesture}>
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.headerRow}>
        {DAY_LABELS.map((lbl, i) => (
          <View key={lbl} style={[styles.headerCell, i < 6 && styles.headerCellBorder]}>
            <Text style={styles.headerLabel}>{lbl}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, row) => {
        const isSelected = row === selectedWeekRow;
        const isAfterSelected = row === selectedWeekRow + 1;
        const isLastSelected = row === 5 && isSelected;
        return (
        <View
          key={row}
          style={[
            styles.weekRow,
            row === 5 && styles.weekRowLast,
            isSelected && styles.weekRowSelected,
            isAfterSelected && styles.weekRowAfterSelected,
            isLastSelected && styles.weekRowLastSelected,
          ]}
        >
          {Array.from({ length: 7 }, (_, col) => {
            const cell = grid[row * 7 + col];
            const isSelected = isSameDay(cell.date, selectedDay);
            const dayTasks = taskMap.get(dateKey(cell.date)) ?? [];

            return (
              <TouchableOpacity
                key={col}
                style={[styles.dayCell, col === 6 && styles.dayCellLast]}
                onPress={() => handleDayTap(cell.date)}
                activeOpacity={0.65}
              >
                <View style={[styles.dayNumWrap, isSelected && styles.dayNumSelected]}>
                  <Text
                    style={[
                      styles.dayNum,
                      !cell.isCurrentMonth && styles.dayNumOverflow,
                      isSelected && styles.dayNumSelText,
                    ]}
                  >
                    {cell.dayOfMonth}
                  </Text>
                </View>
                {dayTasks.length > 0 && (
                  <View style={styles.dotRow}>
                    {dayTasks.slice(0, 3).map((t, i) => (
                      <View
                        key={i}
                        style={[styles.dot, { backgroundColor: getTaskPriorityDotColor(t.priority) }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        );
      })}
    </View>
    </GestureDetector>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: 'transparent',
    backgroundColor: colors.headerAxisBG,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  headerCellBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekRow: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  weekRowLast: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekRowSelected: {
    borderTopColor: colors.accent,
    borderLeftColor: colors.accent,
    borderRightColor: colors.accent,
  },
  weekRowAfterSelected: {
    borderTopColor: colors.accent,
  },
  weekRowLastSelected: {
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayCellLast: {
    borderRightWidth: 0,
  },
  dayNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumSelected: {
    backgroundColor: colors.accent,
  },
  dayNum: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  dayNumOverflow: {
    color: colors.muted,
    opacity: 0.45,
  },
  dayNumSelText: {
    color: '#fff',
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
