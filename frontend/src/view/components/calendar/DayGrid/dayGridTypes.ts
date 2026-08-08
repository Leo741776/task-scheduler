import type { Task } from '../../../../viewmodel/hooks/useTasks';

// Returns the absolute day-index in dayData that should sit at the left
// edge of the viewport after a mount / reanchor.
// Returns -1 when selectedDay is not present in dayData

// Weekly returns the Sun-Sat week containing selectedDay.
// Daily will return indexOf(selectedDay).
export type ViewportStartFor = (selectedDay: Date, dayData: Date[]) => number;

// Passed to renderHeader.
export interface RenderHeaderCtx {
  dayData: Date[];
  renderRange: { start: number; end: number };
  dayColW: number;
  selectedDay: Date;
  // UI-thread style carrying translateX = -panX.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headerRowAnimatedStyle: any;
  isPositioned: boolean;
  // Exposed so the mode's header can size the corner
  // top-left box to match the body's time-axis column.
  timeAxisWidth: number;
  dayHeaderHeight: number;
  // True when DayGrid is the active visible calendar view.
  active: boolean;
}

// Passed to renderDayColumn for each day in the current renderRange slice.
// The mode wrapper returns JSX filling a column of size (dayColW x 100%).
export interface RenderDayColumnCtx {
  date: Date;
  isSelected: boolean;
  dayColW: number;
  tasks: Task[];
  absIndex: number;
}
