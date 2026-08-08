import { View, StyleSheet } from 'react-native';
import { AppColors, useTheme, sizes } from '../../../../nativeTheme';

import React, { useMemo } from 'react';

interface Props {
  dayColW?: number;
}

// resize automatically when DayGrid's animated hourRowH height changes.
export default function DayCellColumn({ dayColW }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  
  const DAY_W = dayColW ?? sizes.dayColW;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View style={{ width: DAY_W, height: '100%' }}>
      {hours.map((h) => (
        <View
          key={h}
          style={[
            styles.hourCell,
            {
              left: 0,
              top: `${(h / 24) * 100}%`,
              width: DAY_W,
              height: `${100 / 24}%`,
            },
            // To avoid stacking bottom borders
            h === 23 && { borderBottomWidth: 0 },
          ]}
        />
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  hourCell: {
    position: 'absolute',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid, // Opaque row separator, see nativeTheme.ts
  },
});
