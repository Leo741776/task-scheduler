import React, { useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';
import type { RenderHeaderCtx } from '../DayGrid/dayGridTypes';
import { MONTH_NAMES_LONG } from '../../../../utils/format';

const DOW_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const DOUBLE_TAP_MS = 300;

interface Props extends RenderHeaderCtx {
  // Double-tap on day pill switches to Weekly.
  onHeaderDoubleTap?: () => void;
}

export default function DailyHeader({
  selectedDay,
  dayHeaderHeight,
  onHeaderDoubleTap,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Daily header is not scrollable.
  // Pill mirrors selectedDay, which is always the day on screen.
  // headerRowAnimatedStyle / dayData / renderRange from ctx are unused.
  const lastTapRef = useRef<number>(0);

  const onPress = () => {
    if (!onHeaderDoubleTap) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onHeaderDoubleTap();
      return;
    }
    lastTapRef.current = now;
  };

  //const label = `${DOW_LONG[selectedDay.getDay()]} ${selectedDay.getMonth() + 1}/${selectedDay.getDate()}`;
  const label = `${DOW_LONG[selectedDay.getDay()]} ${MONTH_NAMES_LONG[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`;

  return (
    <View style={[styles.topRow, { height: dayHeaderHeight }]}>
      <Pressable style={styles.headerPill} onPress={onPress}>
        <Text style={styles.dayHeaderText}>{label}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    // backgroundColor: colors.panel,
    backgroundColor: colors.headerAxisBG,
    // Above the sibling ScrollView so it goes above the time-axis.
    // zIndex works for iOS/web; elevation is Android's equivalent.
    zIndex: 2,
    elevation: 2,
  },
  headerPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
