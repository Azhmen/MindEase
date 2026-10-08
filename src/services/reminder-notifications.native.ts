import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { reminderContent, type AppointmentReminder } from '@/utils/appointment-reminder-plan';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
async function channel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('appointments', { name: 'Appointment reminders', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default' });
}
export async function requestReminderPermission() {
  await channel();
  let result = await Notifications.getPermissionsAsync();
  if (result.status === 'undetermined') result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
export async function cancelNativeReminders(uid: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(item => item.identifier.startsWith(`mindease:${uid}:`)).map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}
export async function getNativeReminderIds(uid: string) {
  return (await Notifications.getAllScheduledNotificationsAsync()).filter(item => item.identifier.startsWith(`mindease:${uid}:`)).map(item => item.identifier);
}
export async function showImmediateNotification(id: string, title: string, body: string, stillCurrent = () => true) {
  await channel();
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'undetermined') { await requestReminderPermission(); permission = await Notifications.getPermissionsAsync(); }
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) return 'permission-denied' as const;
  if (!stillCurrent()) throw new Error('Your notification session ended.');
  await Notifications.scheduleNotificationAsync({ identifier: id, content: { title, body, sound: 'default' }, trigger: Platform.OS === 'android' ? { channelId: 'appointments' } : null });
  return 'native' as const;
}
export async function reconcileNativeReminders(uid: string, plan: AppointmentReminder[]) {
  await channel();
  let permission = await Notifications.getPermissionsAsync();
  if (plan.length && permission.status === 'undetermined') { await requestReminderPermission(); permission = await Notifications.getPermissionsAsync(); }
  const allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const future = allowed ? plan.filter(item => item.fireAt > Date.now()) : [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const existing of scheduled.filter(item => item.identifier.startsWith(`mindease:${uid}:`))) {
    const desired = future.find(item => item.id === existing.identifier);
    if (!desired || existing.content.data?.fireAt !== desired.fireAt) await Notifications.cancelScheduledNotificationAsync(existing.identifier);
  }
  for (const item of future) {
    if (scheduled.some(existing => existing.identifier === item.id && existing.content.data?.fireAt === item.fireAt)) continue;
    await Notifications.scheduleNotificationAsync({ identifier: item.id, content: { ...reminderContent(item), data: { fireAt: item.fireAt }, sound: 'default' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.fireAt), channelId: 'appointments' } });
  }
  return allowed ? 'native' as const : 'permission-denied' as const;
}
