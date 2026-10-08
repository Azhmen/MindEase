import { StatusChip } from '@/components/wellness-ui';
import { FormPanel, presentation } from '@/components/presentation';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Switch, View } from 'react-native';
import { CounselorScreen } from '@/components/counselor-ui';
import { CareIcon } from '@/components/care-icon';
import { Colors } from '@/constants/colors';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { AvailabilityDatePicker } from '@/components/availability-date-picker';
import { AvailabilityTimePicker } from '@/components/availability-time-picker';
import { validateAvailabilityForm } from '@/utils/availability-form';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LoadingState, StatusMessage } from '@/components/student-screen';
import { Choice, AppointmentSummary, appointmentStyles } from '@/components/appointment-ui';
import { bookingDateLabel, localDateString } from '@/constants/booking';
import { createAvailabilitySlot, deleteAvailabilitySlot, getAvailabilitySlot, getOwnAvailability, updateAvailabilitySlot, getCounselorSessions, getCounselorSession, getSessionPreSessionNote, updateSessionStatus, type AvailabilityInput, type AvailabilitySlot } from '@/services/counselor-management';
import type { Appointment } from '@/services/appointments';
import { getAuthErrorMessage } from '@/utils/auth';

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt; let active = true; setLoading(true); setError(''); setData(null);
    load().then(value => { if (active) setData(value); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, attempt]));
  return { data, setData, loading, error, retry: () => setAttempt(v => v + 1) };
}
function useAction() {
  const lock = useRef(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run(action: () => Promise<void>) { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { await action(); } catch (err) { setError(getAuthErrorMessage(err)); } finally { lock.current = false; setBusy(false); } }
  return { busy, error, run };
}
function LoadState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) { return <>{loading ? <LoadingState /> : null}<StatusMessage message={error} error />{error ? <CareButton title="Try again" secondary onPress={retry} /> : null}</>; }
export function AvailabilityScreen() {
  const router = useRouter(), state = useLoad(getOwnAvailability), action = useAction(), [deleteId, setDeleteId] = useState(''), [notice, setNotice] = useState('');
  return <CounselorScreen title="Your Availability"><AppText style={studentStyles.muted}>Manage the times students can choose when booking.</AppText><CareButton title="Add Availability" onPress={() => router.push('/counselor/availability/new')} /><CareButton title="View Sessions" secondary onPress={() => router.push('/counselor/sessions')} /><LoadState {...state} /><StatusMessage message={action.error} error /><StatusMessage message={notice} />
    {state.data?.length === 0 ? <StudentCard><CareIcon name="clock" size={32} /><AppText style={studentStyles.section}>No availability slots yet.</AppText><AppText style={studentStyles.muted}>Add a date, time and meeting format to get started.</AppText></StudentCard> : null}
    {state.data?.map(slot => <StudentCard key={slot.id} style={{ padding: 18, gap: 12 }}><AppText style={studentStyles.section}>{bookingDateLabel(slot.date)}</AppText><AppText>{slot.startTime} – {slot.endTime}</AppText><AppText style={studentStyles.muted}>{slot.mode === 'virtual' ? 'Virtual' : 'In-Person'}{slot.location ? ' · ' + slot.location : ''}</AppText><StatusChip label={slot.isAvailable ? 'Available' : 'Unavailable'} /><View style={studentStyles.row}><CareButton title="Edit" compact secondary disabled={action.busy} onPress={() => router.push({ pathname: '/counselor/availability/edit/[id]', params: { id: slot.id } })} /><CareButton danger compact title="Delete" secondary disabled={action.busy} onPress={() => { setNotice(''); setDeleteId(slot.id); }} /></View>{deleteId === slot.id ? <><AppText accessibilityRole="alert">Delete this availability slot?</AppText><CareButton danger title={action.busy ? 'Deleting...' : 'Delete Slot'} disabled={action.busy} onPress={() => action.run(async () => { await deleteAvailabilitySlot(slot.id, slot.counselorId); state.setData(current => current?.filter(item => item.id !== slot.id) ?? null); setDeleteId(''); setNotice('Availability slot deleted.'); })} /><CareButton title="Cancel" secondary disabled={action.busy} onPress={() => setDeleteId('')} /></> : null}</StudentCard>)}
  </CounselorScreen>;
}
function AvailabilityForm({ slot }: { slot?: AvailabilitySlot }) {
  const router = useRouter(), action = useAction(), [confirmDelete, setConfirmDelete] = useState(false);
  const [value, setValue] = useState<AvailabilityInput>(slot ?? { date: '', startTime: '', endTime: '', mode: 'virtual', location: '', isAvailable: true });
  const change = (next: Partial<AvailabilityInput>) => setValue(current => ({ ...current, ...next }));
  return <><FormPanel>
    <AvailabilityDatePicker value={value.date} disabled={action.busy} onChange={date => change({ date })} />
    <View style={presentation.formRow}>
      <View style={presentation.formColumn}><AvailabilityTimePicker label="Start time" value={value.startTime} disabled={action.busy} onChange={startTime => change({ startTime })} /></View>
      <View style={presentation.formColumn}><AvailabilityTimePicker label="End time" value={value.endTime} disabled={action.busy} onChange={endTime => change({ endTime })} /></View>
    </View>
    <AppText style={studentStyles.section}>Meeting format</AppText><View style={studentStyles.row}>{(['virtual', 'in_person'] as const).map(mode => <Choice key={mode} label={mode === 'virtual' ? 'Virtual' : 'In-Person'} selected={value.mode === mode} disabled={action.busy} onPress={() => change({ mode })} />)}</View>{value.mode === 'in_person' ? <AppTextInput label="Location" placeholder="Configured campus room or meeting point" value={value.location} maxLength={200} editable={!action.busy} onChangeText={location => change({ location })} /> : null}<View style={studentStyles.row}><AppText style={studentStyles.flex}>Available for booking</AppText><Switch trackColor={{ false: Colors.careBorder, true: Colors.careAccent }} thumbColor={Colors.surface} accessibilityLabel="Available for booking" value={value.isAvailable} disabled={action.busy} onValueChange={isAvailable => change({ isAvailable })} /></View><AppText style={studentStyles.muted}>Dates and times use your device&apos;s local time.</AppText></FormPanel><StatusMessage message={action.error} error /><CareButton title={action.busy ? 'Saving...' : slot ? 'Save Changes' : 'Create Slot'} disabled={action.busy} onPress={() => action.run(async () => { validateAvailabilityForm(value); if (slot) await updateAvailabilitySlot(slot.id, value); else await createAvailabilitySlot(value); router.replace('/counselor/availability'); })} /><CareButton title="Cancel" secondary disabled={action.busy} onPress={() => router.replace('/counselor/availability')} />
    {slot ? <><CareButton title="Delete" danger secondary disabled={action.busy} onPress={() => setConfirmDelete(true)} />{confirmDelete ? <StudentCard><AppText accessibilityRole="alert">Delete this availability slot?</AppText><CareButton title={action.busy ? 'Deleting...' : 'Delete Slot'} danger disabled={action.busy} onPress={() => action.run(async () => { await deleteAvailabilitySlot(slot.id, slot.counselorId); router.replace('/counselor/availability'); })} /><CareButton title="Keep Slot" secondary disabled={action.busy} onPress={() => setConfirmDelete(false)} /></StudentCard> : null}</> : null}
  </>;
}
export function NewAvailabilityScreen() { return <CounselorScreen title="Add Availability"><AvailabilityForm /></CounselorScreen>; }
export function EditAvailabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), load = useCallback(() => getAvailabilitySlot(typeof id === 'string' ? id : ''), [id]), state = useLoad(load);
  return <CounselorScreen title="Edit Availability"><LoadState {...state} />{state.data ? <AvailabilityForm key={state.data.id} slot={state.data} /> : null}</CounselorScreen>;
}
export function SessionCard({ session }: { session: Appointment }) {
  const router = useRouter();
  return <StudentCard style={{ backgroundColor: Colors.surface, padding: 18, gap: 12 }}><AppText style={studentStyles.section}>Student session</AppText><AppText>{bookingDateLabel(session.appointmentDate)} · {session.appointmentTime}</AppText><AppText style={studentStyles.muted}>{session.sessionFormat}</AppText><StatusChip label={session.status} /><CareButton title="View Session" secondary compact onPress={() => router.push({ pathname: '/counselor/session/[id]', params: { id: session.id } })} /></StudentCard>;
}
export function SessionsScreen() {
  const state = useLoad(getCounselorSessions), today = localDateString(new Date());
  const groups = [
    { title: 'Today', items: state.data?.filter(s => s.appointmentDate === today && !['completed', 'cancelled'].includes(s.status)) },
    { title: 'Upcoming', items: state.data?.filter(s => s.appointmentDate > today && !['completed', 'cancelled'].includes(s.status)) },
    { title: 'Past · awaiting status', items: state.data?.filter(s => s.appointmentDate < today && !['completed', 'cancelled'].includes(s.status)) },
    ...(['completed', 'cancelled'] as const).map(status => ({ title: status === 'completed' ? 'Completed' : 'Cancelled', items: state.data?.filter(s => s.status === status) })),
  ];
  return <CounselorScreen title="Your Sessions"><AppText style={studentStyles.muted}>Only appointments assigned to you appear here.</AppText><LoadState {...state} />{state.data ? groups.map(group => <View key={group.title} style={[appointmentStyles.group, presentation.timeline]}><AppText style={studentStyles.section}>{group.title}</AppText>{group.items?.length ? group.items.map(session => <SessionCard key={session.id} session={session} />) : <StudentCard><CareIcon name="clock" size={26} /><AppText style={studentStyles.muted}>No sessions in this section.</AppText></StudentCard>}</View>) : null}</CounselorScreen>;
}
export function SessionDetailsScreen() {
  const router = useRouter(), { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(async () => { const session = await getCounselorSession(id); const note = await getSessionPreSessionNote(id); return { session, note }; }, [id]);
  const state = useLoad(load), action = useAction(), [confirm, setConfirm] = useState<'completed' | 'cancelled' | null>(null), [notice, setNotice] = useState('');
  const session = state.data?.session;
  return <CounselorScreen title="Session Details"><LoadState {...state} /><StatusMessage message={action.error} error /><StatusMessage message={notice} />{session ? <><AppText style={studentStyles.section}>Student session</AppText><AppText style={studentStyles.muted}>Student identity is kept private; account IDs are not displayed.</AppText><AppointmentSummary {...session} /><AppText style={appointmentStyles.status}>{session.status}</AppText><StudentCard><AppText style={studentStyles.section}>Pre-session note · read only</AppText><AppText>{state.data?.note || 'No pre-session note added.'}</AppText></StudentCard>{['booked', 'rescheduled'].includes(session.status) ? <><CareButton title="Mark Completed" disabled={action.busy} onPress={() => setConfirm('completed')} /><CareButton danger compact title="Cancel Session" secondary disabled={action.busy} onPress={() => setConfirm('cancelled')} />{confirm ? <StudentCard><AppText>Mark this session {confirm}?</AppText><CareButton title={action.busy ? 'Updating...' : 'Confirm Status'} disabled={action.busy} onPress={() => action.run(async () => { await updateSessionStatus(session.id, confirm); state.setData(current => current ? { ...current, session: { ...current.session, status: confirm } } : current); setConfirm(null); setNotice('Session status updated.'); })} /><CareButton title="Keep Current Status" secondary disabled={action.busy} onPress={() => setConfirm(null)} /></StudentCard> : null}</> : <AppText style={studentStyles.muted}>This session is closed.</AppText>}</> : null}<CareButton title="Back to Sessions" secondary onPress={() => router.replace('/counselor/sessions')} /></CounselorScreen>;
}
