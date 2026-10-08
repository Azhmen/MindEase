import { useEffect, useState, type PropsWithChildren } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AppState } from 'react-native';
import { auth } from '@/config/firebase';
import { cancelAppointmentReminders, scheduleAppointmentReminders, subscribeToAppointmentReminderInputs, subscribeAppointmentReminderState, emptyReminderSnapshot } from '@/services/appointment-reminders';
import type { ReminderAppointment } from '@/utils/appointment-reminder-plan';
import { getAuthErrorMessage } from '@/utils/auth';
import { ReminderContext } from '@/components/appointment-reminder-banner';

export function AppointmentReminderProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(() => ({ ...emptyReminderSnapshot, now: Date.now() }));
  useEffect(() => {
    let stopInputs: (() => void) | undefined, stopStatus: (() => void) | undefined, uid = '', version = 0;
    let latest: { entries: ReminderAppointment[]; enabled: boolean } | undefined;
    function fail(error: unknown) { console.error('Appointment reminders', error); setState(current => ({ ...current, plan: [], statuses: {}, error: getAuthErrorMessage(error), now: Date.now() })); }
    function reconcile() {
      if (!latest || !uid) return;
      const current = version;
      void scheduleAppointmentReminders(latest.entries, latest.enabled, uid).catch(error => { if (current === version) fail(error); });
    }
    const stopAuth = onAuthStateChanged(auth, user => {
      version++; stopInputs?.(); stopStatus?.(); stopInputs = undefined; stopStatus = undefined; latest = undefined;
      if (uid) void cancelAppointmentReminders(uid).catch(error => console.error('Cancel appointment reminders', error));
      uid = ''; setState({ ...emptyReminderSnapshot, now: Date.now() });
      if (!user || user.isAnonymous) return;
      uid = user.uid;
      const ownerUid = uid, subscriptionVersion = version;
      stopStatus = subscribeAppointmentReminderState(ownerUid, value => { if (subscriptionVersion === version) setState({ ...value, now: Date.now() }); });
      stopInputs = subscribeToAppointmentReminderInputs(ownerUid, (entries, enabled) => {
        if (subscriptionVersion !== version) return;
        latest = { entries, enabled }; reconcile();
      }, error => {
        if (subscriptionVersion !== version) return;
        version++; latest = undefined; fail(error);
        void cancelAppointmentReminders(ownerUid).catch(cancelError => console.error('Cancel stale reminders', cancelError));
      });
    });
    const interval = setInterval(reconcile, 60000);
    const clock = setInterval(() => setState(current => ({ ...current, now: Date.now() })), 1000);
    const appState = AppState.addEventListener('change', value => { if (value === 'active') reconcile(); });
    return () => { version++; stopAuth(); stopInputs?.(); stopStatus?.(); clearInterval(interval); clearInterval(clock); appState.remove(); if (uid) void cancelAppointmentReminders(uid).catch(error => console.error('Cancel appointment reminders', error)); };
  }, []);
  return <ReminderContext.Provider value={state}>{children}</ReminderContext.Provider>;
}
