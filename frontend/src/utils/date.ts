// @ts-nocheck
export function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isSameMonth(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function daysBetween(date1, date2) {
  const start = startOfDay(date1);
  const end = startOfDay(date2);
  const diffTime = end - start;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getLastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function createDate(year, month, day) {
  return new Date(year, month, day);
}

export function cloneDate(date) {
  return new Date(date);
}
