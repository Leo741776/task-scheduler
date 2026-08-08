export const DEFAULT_TASK_PRIORITY = 3;

/** Priority 1 = lowest, 5 = highest - distinct dot colors on the calendar. */
export const PRIORITY_DOT_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#eab308',
  4: '#f97316',
  5: '#dc2626',
};

export function getTaskPriorityDotColor(priority?: number): string {
  const p = typeof priority === 'number' && priority >= 1 && priority <= 5 ? priority : DEFAULT_TASK_PRIORITY;
  return PRIORITY_DOT_COLORS[p];
}
