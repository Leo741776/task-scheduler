// @ts-nocheck
export function getTaskRect(task, days) {
  if (!task?.start || !task?.end) return null;

  const start = task.start;
  const end = task.end;

  const dayIndex = days.findIndex(
    (d) =>
      d.date.getFullYear() === start.getFullYear() &&
      d.date.getMonth() === start.getMonth() &&
      d.date.getDate() === start.getDate()
  );
  if (dayIndex < 0) return null;

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const durationMinutes = Math.max(15, endMinutes - startMinutes);

  const top = `calc(var(--hour-row-h) * ${startMinutes / 60})`;
  const height = `calc(var(--hour-row-h) * ${durationMinutes / 60})`;
  const left = `calc(var(--day-col-w) * ${dayIndex})`;
  const width = `calc(var(--day-col-w) - 1px)`;

  return { left, top, width, height };
}
