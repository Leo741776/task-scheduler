import { usePreferencesStore } from '../stores/preferencesStore';
import { useAuthStore } from '../stores/authStore';

export function usePreferences() {
  const userId = useAuthStore((s) => s.user?.id);
  const prefs = usePreferencesStore((s) => (userId != null ? s.byUser[userId] : undefined));
  const setNotificationsEnabled = usePreferencesStore((s) => s.setNotificationsEnabled);
  const setNotificationSoundEnabled = usePreferencesStore((s) => s.setNotificationSoundEnabled);

  return {
    notificationsEnabled: prefs?.notificationsEnabled ?? true,
    notificationSoundEnabled: prefs?.notificationSoundEnabled ?? true,
    setNotificationsEnabled,
    setNotificationSoundEnabled,
  };
}
