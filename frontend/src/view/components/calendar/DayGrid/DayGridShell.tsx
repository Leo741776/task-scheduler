import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import DayGrid, { DayGridHandle } from './DayGrid';
import WeeklyHeader from '../WeeklyGrid/WeeklyHeader';
import WeeklyDayColumn from '../WeeklyGrid/WeeklyDayColumn';
import DailyHeader from '../DailyGrid/DailyHeader';
import DayCellColumn from '../CellLayer/DayCellColumn';
import DayTaskColumn from '../TaskLayer/DayTaskColumn';
import {
  WEEKLY_VISIBLE_COLS,
  weeklyViewportStartFor,
} from '../WeeklyGrid/weeklyMode';
import {
  DAILY_VISIBLE_COLS,
  dailyViewportStartFor,
} from '../DailyGrid/dailyMode';
import type { Task } from '../../../../viewmodel/hooks/useTasks';
import type { NonMonthlyMode, ViewMode } from '../../../../viewmodel/hooks/useCalendar';
import type { RenderHeaderCtx, RenderDayColumnCtx } from './dayGridTypes';

// Imperative handle received by CalendarScreen.
// DayGrid's recenter / scrollToHour.
export type { DayGridHandle } from './DayGrid';

interface Props {
  // active / inactive + weekly / daily
  viewMode: ViewMode;
  selectedDay: Date;
  tasks: Task[];
  // Weekly header day-cell tap
  // Daily viewport settle after a pan (via DayGrid.onViewportSettled)
  onSelectedDayChange: (d: Date) => void;
  // leftmost-visible date
  onWeeklyViewportSettled: (d: Date) => void;
  // switch to Daily
  onWeeklyDayDoubleTap: (d: Date) => void;
  // switch to Weekly
  onDailyHeaderDoubleTap: () => void;
  // Weekly -> Daily
  onPinchIn: () => void;
  // Weekly -> Monthly, Daily -> Weekly.
  onPinchOut: () => void;
  // Daily -> Monthly
  onLargePinchOut?: () => void;
  // currently unused from DayGrid
  onLargePinchIn?: () => void;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Rendered once by CalendarScreen
// Swapping between Weekly and Daily is a prop change
// (visibleCols / viewportStartFor / renderHeader / renderDayColumn / onViewportSettled)
// on the same DayGrid instance.
const DayGridShell = forwardRef<DayGridHandle, Props>(function DayGridShell({
  viewMode,
  selectedDay,
  tasks,
  onSelectedDayChange,
  onWeeklyViewportSettled,
  onWeeklyDayDoubleTap,
  onDailyHeaderDoubleTap,
  onPinchIn,
  onPinchOut,
  onLargePinchIn,
  onLargePinchOut,
}, ref) {
  // Last non-monthly mode the user was in.
  const lastNonMonthlyModeRef = useRef<NonMonthlyMode>(
    viewMode === 'monthly' ? 'weekly' : viewMode
  );
  if (viewMode !== 'monthly') {
    lastNonMonthlyModeRef.current = viewMode;
  }
  const mode: NonMonthlyMode =
    viewMode === 'monthly' ? lastNonMonthlyModeRef.current : viewMode;
  const active = viewMode !== 'monthly';

  // Inner ref to DayGrid.
  const dayGridRef = useRef<DayGridHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      recenter: () => dayGridRef.current?.recenter(),
      scrollToHour: (h) => dayGridRef.current?.scrollToHour(h),
    }),
    []
  );

  // recenters onto selectedDay.
  const onMDPillPress = useCallback(() => {
    dayGridRef.current?.recenter();
  }, []);

  const isDaily = mode === 'daily';

  // Visible day is selected whenever daily horizontal scroll settles
  const onDailyViewportSettled = useCallback(
    (d: Date) => {
      if (!isSameDay(d, selectedDay)) {
        onSelectedDayChange(d);
      }
    },
    [selectedDay, onSelectedDayChange]
  );

  const renderHeader = isDaily
    ? (ctx: RenderHeaderCtx) => (
        <DailyHeader {...ctx} onHeaderDoubleTap={onDailyHeaderDoubleTap} />
      )
    : (ctx: RenderHeaderCtx) => (
        <WeeklyHeader
          {...ctx}
          onDayPress={onSelectedDayChange}
          onDayDoubleTap={onWeeklyDayDoubleTap}
          onRecenter={onMDPillPress}
        />
      );

  const renderDayColumn = isDaily
    ? ({ date, dayColW, tasks: dayTasks }: RenderDayColumnCtx) => (
        <View style={{ width: dayColW, height: '100%' }}>
          <DayCellColumn dayColW={dayColW} />
          <DayTaskColumn
            date={date}
            tasks={dayTasks}
            dayColW={dayColW}
            showDescription
          />
        </View>
      )
    : ({ date, isSelected, dayColW, tasks: dayTasks }: RenderDayColumnCtx) => (
        <WeeklyDayColumn
          date={date}
          isSelected={isSelected}
          dayColW={dayColW}
          tasks={dayTasks}
        />
      );

  return (
    <DayGrid
      ref={dayGridRef}
      active={active}
      selectedDay={selectedDay}
      tasks={tasks}
      visibleCols={isDaily ? DAILY_VISIBLE_COLS : WEEKLY_VISIBLE_COLS}
      viewportStartFor={isDaily ? dailyViewportStartFor : weeklyViewportStartFor}
      renderHeader={renderHeader}
      renderDayColumn={renderDayColumn}
      onViewportSettled={isDaily ? onDailyViewportSettled : onWeeklyViewportSettled}
      onPinchIn={onPinchIn}
      onPinchOut={onPinchOut}
      onLargePinchIn={onLargePinchIn}
      onLargePinchOut={onLargePinchOut}
    />
  );
});

export default DayGridShell;
