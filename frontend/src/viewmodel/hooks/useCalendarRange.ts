import { useCalendarStore } from '../stores/calendarStore';
import { formatMonthYearLong } from '../../utils/format';

export function useCalendarRange() {
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const first = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const last = new Date(year, month + 1, 0);
  const lastDay = last.getDate();

  const days = Array.from({ length: lastDay }, (_, i) => {
    const dayOfMonth = i + 1;
    const date = new Date(year, month, dayOfMonth);
    return {
      index: i,
      dayOfMonth,
      date,
      key: `${year}-${month}-${dayOfMonth}`,
    };
  });

  const monthLabel = formatMonthYearLong(first);

  return { days, monthLabel };
}
