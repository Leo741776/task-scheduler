import type { ViewportStartFor } from '../DayGrid/dayGridTypes';

// Number of visible day columns in Daily mode.
// Determines dayColW, maxPanX, and renderRange
export const DAILY_VISIBLE_COLS = 1;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// selectedDay sits at the left edge with visibleCols=1
export const dailyViewportStartFor: ViewportStartFor = (selectedDay, dayData) => {
  return dayData.findIndex((x) => isSameDay(x, selectedDay));
};
