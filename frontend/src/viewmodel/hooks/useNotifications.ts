import { usePreferencesStore } from '../stores/preferencesStore';
import { useAuthStore } from '../stores/authStore';
import {
  initializeNotifications,
  ensureNotificationPermission,
  scheduleTaskDayNotification,
  playNotificationNow,
} from '../../model/services/notifications';

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const prefs = usePreferencesStore((s) => (userId != null ? s.byUser[userId] : undefined));
  const notificationsEnabled = prefs?.notificationsEnabled ?? true;
  const notificationSoundEnabled = prefs?.notificationSoundEnabled ?? true;

  const initialize = () => initializeNotifications();

  const requestPermission = () => ensureNotificationPermission();

  const scheduleTaskDay = async (task: { start?: Date | string; title?: string }) => {
    if (!notificationsEnabled) return;
    await scheduleTaskDayNotification(task);
  };

  const playNow = async (title: string, body: string) => {
    if (!notificationSoundEnabled) return;
    await playNotificationNow(title, body);
  };

  return { initialize, requestPermission, scheduleTaskDay, playNow };
}
