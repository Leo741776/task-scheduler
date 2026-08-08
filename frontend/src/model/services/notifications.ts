import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let notificationsInitialized = false;
let permissionRequested = false;

export async function initializeNotifications() {
  if (notificationsInitialized) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#6aa6ff',
    });
  }

  notificationsInitialized = true;
}

export async function ensureNotificationPermission() {
  if (permissionRequested) return;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    permissionRequested = true;
    return;
  }

  const requested = await Notifications.requestPermissionsAsync();
  permissionRequested = requested.granted;
}

export async function scheduleTaskDayNotification(task) {
  if (!task?.start || !task?.title) return;

  const startDate = task.start instanceof Date ? task.start : new Date(task.start);
  const now = new Date();
  if (startDate.getTime() <= now.getTime()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Task reminder',
      body: `you have task(s) today: ${task.title}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: startDate,
      channelId: Platform.OS === 'android' ? 'tasks' : undefined,
    },
  });
}

export async function playNotificationNow(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
}
