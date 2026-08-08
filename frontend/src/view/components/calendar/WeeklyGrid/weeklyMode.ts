import type { ViewportStartFor } from '../DayGrid/dayGridTypes';

// Number of visible day columns in Weekly mode.
// Determines dayColW, maxPanX, and renderRange
export const WEEKLY_VISIBLE_COLS = 7;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Align the viewport so the week starts on Sunday.
// Returns a day index into dayData,
// or -1 if selectedDay is not present in dayData (caller will reanchor).
export const weeklyViewportStartFor: ViewportStartFor = (selectedDay, dayData) => {
  const idx = dayData.findIndex((x) => isSameDay(x, selectedDay));
  if (idx < 0) return -1;
  return Math.max(0, idx - selectedDay.getDay());
};
