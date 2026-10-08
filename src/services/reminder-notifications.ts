import type { AppointmentReminder } from '@/utils/appointment-reminder-plan';

// Expo Web has no local background-notification scheduler. The provider renders due reminders.
export async function requestReminderPermission() { return false; }
export async function reconcileNativeReminders(_uid: string, _plan: AppointmentReminder[]): Promise<'native' | 'permission-denied' | 'in-app'> { return 'in-app'; }
export async function cancelNativeReminders(_uid: string) {}
export async function getNativeReminderIds(_uid: string): Promise<string[]> { return []; }
export async function showImmediateNotification(_id: string, _title: string, _body: string, _stillCurrent?: () => boolean): Promise<'native' | 'in-app' | 'permission-denied'> { return 'in-app'; }
