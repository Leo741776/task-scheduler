import { useCalendarStore, type ViewMode, type NonMonthlyMode } from '../stores/calendarStore';

export type { ViewMode, NonMonthlyMode };

export function useCalendar() {
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const setSelectedDay = useCalendarStore((s) => s.setSelectedDay);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const navigatePrev = useCalendarStore((s) => s.navigatePrev);
  const navigateNext = useCalendarStore((s) => s.navigateNext);

  return {
    selectedDay,
    setSelectedDay,
    viewMode,
    setViewMode,
    navigatePrev,
    navigateNext,
  };
}
