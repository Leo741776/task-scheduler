import React from 'react';
import { View } from 'react-native';
import DayCellColumn from '../CellLayer/DayCellColumn';
import DayTaskColumn from '../TaskLayer/DayTaskColumn';
import { colors, useTheme } from '../../../../nativeTheme';
import type { Task } from '../../../../viewmodel/hooks/useTasks';

interface Props {
  date: Date;
  isSelected: boolean;
  dayColW: number;
  tasks: Task[];
}

// height: '100%' inherits from DayGrid's outer Reanimated.View
function WeeklyDayColumn({ date, isSelected, dayColW, tasks }: Props) {
  useTheme();
  
  return (
    <View style={{ width: dayColW, height: '100%' }}>
      <DayCellColumn dayColW={dayColW} />
      {isSelected && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -1,
            top: 0,
            width: dayColW + 1,
            height: '100%',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderLeftColor: colors.accent,
            borderRightColor: colors.accent,
          }}
        />
      )}
      <DayTaskColumn date={date} tasks={tasks} dayColW={dayColW} isWeeklyMode/>
    </View>
  );
}

export default React.memo(WeeklyDayColumn);
