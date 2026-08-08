import React, { useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';
import type { RenderHeaderCtx } from '../DayGrid/dayGridTypes';

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOUBLE_TAP_MS = 300;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props extends RenderHeaderCtx {
  onDayPress: (date: Date) => void;
  onDayDoubleTap?: (date: Date) => void;
  // Called when the corner M/D pill is pressed.
  onRecenter: () => void;
}

export default function WeeklyHeader({
  dayData,
  renderRange,
  dayColW,
  selectedDay,
  headerRowAnimatedStyle,
  isPositioned,
  timeAxisWidth,
  dayHeaderHeight,
  active,
  onDayPress,
  onDayDoubleTap,
  onRecenter,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const lastTapRef = useRef<{ time: number; key: string } | null>(null);

  const handleDayTap = (d: Date) => {
    const now = Date.now();
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = lastTapRef.current;
    if (onDayDoubleTap && last && last.key === k && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onDayDoubleTap(d);
      return;
    }
    lastTapRef.current = { time: now, key: k };
    onDayPress(d);
  };

  const label = `${selectedDay.getMonth() + 1}/${selectedDay.getDate()}`;

  return (
    <View style={[styles.topRow, { height: dayHeaderHeight }]}>
      <View style={[styles.corner, { width: timeAxisWidth }]}>
        <Pressable onPress={onRecenter} hitSlop={6} style={styles.cornerLabelWrap}>
          <Text style={styles.cornerLabel}>{label}</Text>
        </Pressable>
      </View>
      <View style={styles.dayHeaderClip}>
        {isPositioned && active && (
          <Reanimated.View
            style={[
              {
                width: dayData.length * dayColW,
                height: dayHeaderHeight,
              },
              headerRowAnimatedStyle,
            ]}
          >
            {dayData.slice(renderRange.start, renderRange.end).map((d, i) => {
              const absIndex = renderRange.start + i;
              const isSel = isSameDay(d, selectedDay);
              return (
                <Pressable
                  key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                  onPress={() => handleDayTap(d)}
                  style={[
                    styles.dayHeaderCell,
                    {
                      position: 'absolute',
                      left: absIndex * dayColW,
                      top: 0,
                      width: dayColW,
                      height: dayHeaderHeight,
                    },
                  ]}
                >
                  {d.getDate() === 1 && (
                    <Text style={styles.monthLabel}>{MONTH_LABELS[d.getMonth()]}</Text>
                  )}
                  <Text style={styles.dayHeaderLetter}>{DOW_LETTERS[d.getDay()]}</Text>
                  <View style={[styles.dayNumWrap, isSel && styles.dayNumSelected]}>
                    <Text style={[styles.dayNumText, isSel && styles.dayNumSelectedText]}>
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Reanimated.View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    // backgroundColor: colors.panel,
    backgroundColor: colors.headerAxisBG,
    // zIndex works for iOS/web; elevation is Android's equivalent.
    zIndex: 2,
    elevation: 2,
  },
  corner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cornerLabelWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  cornerLabel: {
    fontSize: 14.14,
    fontWeight: '700',
    color: '#fff',
  },
  dayHeaderClip: {
    flex: 1,
    overflow: 'hidden',
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeaderLetter: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 2,
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
  dayNumText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  dayNumSelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    left: 2,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
});
