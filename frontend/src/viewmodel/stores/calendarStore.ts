import { create } from 'zustand';

export type ViewMode = 'monthly' | 'weekly' | 'daily';

export type NonMonthlyMode = 'weekly' | 'daily';

interface CalendarState {
  // Transitions between daily, weekly, and monthly always follow selectedDay.
  selectedDay: Date;
  viewMode: ViewMode;
  taskEditRequest: number | null;
  // When non-null, the calendar grid renders only tasks whose ids are in this set.
  // Set by SearchModal's "Filter the grid" button; cleared by tapping the search
  // button in the bottom bar.
  searchFilterIds: number[] | null;

  setSelectedDay: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  requestEditTask: (id: number) => void;
  clearTaskEditRequest: () => void;
  setSearchFilterIds: (ids: number[] | null) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDay: new Date(),
  viewMode: 'monthly',
  taskEditRequest: null,
  searchFilterIds: null,

  setSelectedDay: (date) => set({ selectedDay: date }),

  setSearchFilterIds: (ids) => set({ searchFilterIds: ids }),

  setViewMode: (mode) => set({ viewMode: mode }),

  requestEditTask: (id) => set({ taskEditRequest: id }),
  clearTaskEditRequest: () => set({ taskEditRequest: null }),

  navigatePrev: () =>
    set((state) => {
      const first = new Date(
        state.selectedDay.getFullYear(),
        state.selectedDay.getMonth() - 1,
        1
      );
      return { selectedDay: first };
    }),

  navigateNext: () =>
    set((state) => {
      const first = new Date(
        state.selectedDay.getFullYear(),
        state.selectedDay.getMonth() + 1,
        1
      );
      return { selectedDay: first };
    }),
}));
