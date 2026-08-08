export function formatHourLabel(hour24: number): string {
  const isPM = hour24 >= 12;
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12} ${isPM ? "PM" : "AM"}`;
}

export const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// NOT using toLocaleString({ month: 'long' }):
// That would render pre-1582 dates in the Julian calendar,
// which drifts ~10 days from the proleptic Gegorian getMonth()/getFullYear() return.
export function formatMonthYearLong(date: Date): string {
  return `${MONTH_NAMES_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
