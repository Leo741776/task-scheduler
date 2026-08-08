import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

interface UserPreferences {
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  notificationsEnabled: true,
  notificationSoundEnabled: true,
};

interface PreferencesState {
  byUser: Record<number, UserPreferences>;
  setNotificationsEnabled: (value: boolean) => void;
  setNotificationSoundEnabled: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      byUser: {},

      setNotificationsEnabled: (value) => {
        const userId = useAuthStore.getState().user?.id;
        if (userId == null) return;
        set((state) => ({
          byUser: {
            ...state.byUser,
            [userId]: {
              ...DEFAULT_PREFS,
              ...state.byUser[userId],
              notificationsEnabled: value,
            },
          },
        }));
      },

      setNotificationSoundEnabled: (value) => {
        const userId = useAuthStore.getState().user?.id;
        if (userId == null) return;
        set((state) => ({
          byUser: {
            ...state.byUser,
            [userId]: {
              ...DEFAULT_PREFS,
              ...state.byUser[userId],
              notificationSoundEnabled: value,
            },
          },
        }));
      },
    }),
    {
      name: 'preferences-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byUser: state.byUser }),
      migrate: () => ({ byUser: {} }),
    }
  )
);

export function getPrefsForUser(userId: number | undefined): UserPreferences {
  if (userId == null) return DEFAULT_PREFS;
  return usePreferencesStore.getState().byUser[userId] ?? DEFAULT_PREFS;
}
