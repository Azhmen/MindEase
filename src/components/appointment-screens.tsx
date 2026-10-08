import { FormPanel, StepRail } from '@/components/presentation';
import { Colors } from '@/constants/colors';
import { assertAvailableBooking } from '@/services/counselor-management';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { CareIcon } from '@/components/care-icon';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LoadingState, StudentScreen, StatusMessage } from '@/components/student-screen';
import { useBookingDraft } from '@/components/booking-draft';
import { AppointmentSummary, Choice, SchedulePicker, TopicsPicker, appointmentStyles as styles } from '@/components/appointment-ui';
import { appointmentStart, cancelAppointment, createAppointment, getAppointment, getAppointmentsForStudent, getBookingCounselors, newAppointmentId, updateAppointment, validateSchedule, type Appointment, type BookingCounselor } from '@/services/appointments';
import { createPreSessionNote, deletePreSessionNote, getPreSessionNote, updatePreSessionNote, type PreSessionNote } from '@/services/pre-session-notes';
import { AppointmentReminderStatus } from '@/components/appointment-reminder-status';
import { AppointmentReminderBanner } from '@/components/appointment-reminder-banner';
import { handleAppointmentReminderEvent } from '@/services/appointment-reminders';
import { requireUserId } from '@/services/student-session';
import { getAuthErrorMessage } from '@/utils/auth';

// All mutations use a synchronous lock as well as disabled buttons.
function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return { busy, error, run };
}
function MissingDraft() {
  const router = useRouter();
  return <StudentScreen title="Start your booking"><AppText style={studentStyles.muted}>Your booking draft is not available. Please select your counselor, date and time again.</AppText><CareButton title="Book a Counselor" onPress={() => router.replace('/student/appointments/book')} /></StudentScreen>;
}
function useAppointment() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [entry, setEntry] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError(''); setEntry(null);
    if (!id) { setLoading(false); setError('This appointment link is missing its ID.'); return; }
    getAppointment(id).then(value => { if (active) setEntry(value); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]));
  return { id, entry, setEntry, loading, error, retry: () => setAttempt(value => value + 1) };
}

export function AppointmentsScreen() {
  const router = useRouter();
  const { reset } = useBookingDraft();
  const [entries, setEntries] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [now, setNow] = useState(() => Date.now());
  const action = useAction();
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError(''); setEntries([]); setNow(Date.now());
    getAppointmentsForStudent().then(value => { if (active) setEntries(value.filter(entry => entry.status !== 'cancelled')); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  const visibleEntries = entries.filter(entry => entry.status !== 'cancelled');
  return <StudentScreen title="My Appointments" eyebrow="YOUR CAMPUS CARE">
    <AppointmentReminderBanner />
    <AppText style={studentStyles.muted}>A space to talk, at a time that works for you.</AppText>
    <CareButton title="Book Appointment" disabled={action.busy} onPress={() => { reset(); router.push('/student/appointments/book'); }} />
    <StatusMessage message={error || action.error} error /><StatusMessage message={notice} />
    {loading ? <LoadingState /> : null}
    {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error && !visibleEntries.length ? <StudentCard><CareIcon name="clock" size={32} /><AppText style={studentStyles.section}>No appointments yet</AppText><AppText style={studentStyles.muted}>Choose a counselor when you feel ready.</AppText></StudentCard> : null}
    {visibleEntries.map(entry => {
      const canChange = ['booked', 'rescheduled'].includes(entry.status) && appointmentStart(entry).getTime() > now;
      return <StudentCard key={entry.id} style={styles.group}>
        <AppointmentSummary {...entry} embedded />
        <AppText style={styles.status}>{canChange ? 'Upcoming' : 'Past / inactive'}</AppText>
        <CareButton compact title={canChange ? 'View / Edit' : 'View Appointment & Note'} secondary disabled={action.busy} onPress={() => router.push({ pathname: '/student/appointments/edit/[id]', params: { id: entry.id } })} />
        {canChange ? <CareButton danger compact title={action.busy ? 'Cancelling...' : 'Cancel Appointment'} secondary disabled={action.busy} onPress={() => action.run(async () => { setNotice(''); await cancelAppointment(entry.id); setEntries(values => values.filter(value => value.id !== entry.id)); setNotice('Appointment cancelled.'); await handleAppointmentReminderEvent(entry.id, 'cancelled'); })} /> : null}
      </StudentCard>;
    })}
  </StudentScreen>;
}

export function BookAppointmentScreen() {
  const router = useRouter();
  const { draft, setDraft } = useBookingDraft();
  const [counselors, setCounselors] = useState<BookingCounselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [validation, setValidation] = useState('');
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError('');
    getBookingCounselors().then(value => { if (active) setCounselors(value); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  function next() {
    try {
      const counselor = counselors.find(item => item.id === draft.counselorId);
      if (!counselor) throw new Error('Select a counselor.');
      validateSchedule(draft);
      setDraft({ ...draft, id: draft.id || newAppointmentId(), ownerUid: requireUserId(), counselorName: counselor.name });
      setValidation(''); router.push('/student/appointments/pre-session');
    } catch (err) { setValidation(getAuthErrorMessage(err)); }
  }
  return <StudentScreen title="Book a Counselor" showHome={false} eyebrow="TAKE THE NEXT STEP"><StepRail step={1} />
    <StudentCard style={styles.mint}><View style={studentStyles.row}><CareIcon name="lock" size={22} /><AppText style={studentStyles.section}>Your privacy matters</AppText></View><AppText style={styles.small}>Share only what feels comfortable. Your booking and note are protected by your student account. Booking connects you with care; it is not emergency assistance or a substitute for professional treatment.</AppText></StudentCard>
    <AppText style={studentStyles.section}>Choose your counselor</AppText>
    {loading ? <LoadingState /> : null}<StatusMessage message={error || validation} error />
    {error ? <CareButton title="Reload counselors" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error && !counselors.length ? <StudentCard><AppText>No active counselors are available in the directory yet. Please contact campus support or try again later.</AppText><CareButton title="Refresh" secondary onPress={() => setAttempt(value => value + 1)} /></StudentCard> : null}
    {counselors.map(counselor => <StudentCard key={counselor.id} style={{ backgroundColor: draft.counselorId === counselor.id ? Colors.carePale : Colors.surface, padding: 20, borderRadius: 24 }}><View style={studentStyles.row}><CareIcon name="profile" size={30} /><View style={studentStyles.flex}><AppText style={studentStyles.section}>{counselor.name}</AppText>{counselor.title ? <AppText style={styles.small}>{counselor.title}</AppText> : null}{counselor.specialty ? <AppText style={styles.small}>{counselor.specialty}</AppText> : null}</View></View><Choice label={draft.counselorId === counselor.id ? 'Selected' : 'Select Counselor'} selected={draft.counselorId === counselor.id} onPress={() => setDraft({ ...draft, counselorId: counselor.id, counselorName: counselor.name, appointmentTime: '' })} /></StudentCard>)}
    <SchedulePicker counselorId={draft.counselorId} value={draft} onChange={value => setDraft({ ...draft, ...value })} />
    <CareButton title="Continue to Pre-Session Note" disabled={loading || !!error || !counselors.length} onPress={next} />
    <CareButton title="My Appointments" secondary onPress={() => router.replace('/student/appointments')} />
  </StudentScreen>;
}

export function PreSessionScreen() {
  const router = useRouter();
  const { draft, setDraft } = useBookingDraft();
  if (!draft.id) return <MissingDraft />;
  return <StudentScreen title="Before your session" eyebrow="PRE-SESSION NOTE"><StepRail step={2} />
    <AppText style={studentStyles.section}>Help your counselor understand what you would like to talk about.</AppText>
    <AppText style={studentStyles.muted}>This is optional. You can add or edit your note later.</AppText>
    <FormPanel tone="lavender"><TopicsPicker selected={draft.topics} onChange={topics => setDraft({ ...draft, topics })} />
    <AppTextInput label="What would you like support with?" placeholder="Share as much or as little as you like..." multiline maxLength={1500} style={styles.note} value={draft.note} onChangeText={note => setDraft({ ...draft, note })} />
    <AppText style={styles.small}>{draft.note.length}/1500 characters</AppText></FormPanel>
    <CareButton title="Review Appointment" onPress={() => router.push('/student/appointments/confirm')} />
    <CareButton title="Back to Booking" secondary onPress={() => router.back()} />
  </StudentScreen>;
}

export function ConfirmAppointmentScreen() {
  const router = useRouter();
  const { draft, reset } = useBookingDraft();
  const action = useAction();
  if (!draft.id) return <MissingDraft />;
  return <StudentScreen title="Confirm Appointment" eyebrow="ONE LAST LOOK"><StepRail step={3} />
    <AppointmentSummary {...draft} />
    <StudentCard><AppText style={studentStyles.section}>Your pre-session note</AppText>{draft.topics.length ? <AppText style={styles.small}>{draft.topics.join(' · ')}</AppText> : null}<AppText style={styles.small}>{draft.note.trim() || 'No written note added.'}</AppText></StudentCard>
    <StudentCard style={styles.mint}><AppText style={styles.small}>Times come from published counselor availability. Slots are not reserved automatically; confirm meeting arrangements with campus support. Booking is not emergency assistance or a substitute for professional care.</AppText></StudentCard>
    <StatusMessage message={action.error} error />
    <CareButton title={action.busy ? 'Confirming...' : 'Confirm Appointment'} disabled={action.busy} onPress={() => action.run(async () => {
      const text = [draft.topics.length ? 'Topics: ' + draft.topics.join(', ') : '', draft.note.trim()].filter(Boolean).join('\n\n');
      await assertAvailableBooking(draft);
      const id = await createAppointment(draft.id, draft.ownerUid, draft, text);
      await handleAppointmentReminderEvent(id, 'confirmed');
      router.replace({ pathname: '/student/appointments/success', params: { id } }); reset();
    })} />
    <CareButton title="Edit Details" secondary disabled={action.busy} onPress={() => router.push('/student/appointments/book')} />
    <CareButton title="Edit Note" secondary disabled={action.busy} onPress={() => router.push('/student/appointments/pre-session')} />
  </StudentScreen>;
}

export function AppointmentSuccessScreen() {
  const router = useRouter();
  const record = useAppointment();
  return <StudentScreen title="Appointment Booked" eyebrow="YOU HAVE TAKEN A POSITIVE STEP">
    {record.loading ? <LoadingState /> : null}<StatusMessage message={record.error} error />
    {record.error ? <CareButton title="Try again" secondary onPress={record.retry} /> : null}
    {record.entry ? <><StudentCard style={[styles.mint, { alignItems: 'center', padding: 24 }]}><CareIcon name="check" size={36} /><AppText style={studentStyles.section}>Appointment confirmed</AppText><AppText style={styles.small}>Your counseling session is booked for {record.entry.appointmentDate} at {record.entry.appointmentTime}.</AppText><AppText style={styles.small}>Your booking is saved. Contact campus support to confirm meeting arrangements; the selected slot is not automatically reserved.</AppText></StudentCard><AppointmentSummary {...record.entry} /><AppointmentReminderStatus entry={record.entry} /></> : null}
    <CareButton title="View My Appointments" onPress={() => router.replace('/student/appointments')} />
    <CareButton title="Back to Home" secondary onPress={() => router.replace('/student/home')} />
  </StudentScreen>;
}

function NoteEditor({ appointmentId }: { appointmentId: string }) {
  const [note, setNote] = useState<PreSessionNote | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const action = useAction();
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError('');
    getPreSessionNote(appointmentId).then(value => { if (active) { setNote(value); setText(value?.note ?? ''); } }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointmentId, attempt]));
  return <StudentCard>
    <AppText style={studentStyles.section}>Pre-session note</AppText>
    {loading ? <LoadingState /> : null}<StatusMessage message={error || action.error} error /><StatusMessage message={notice} />
    {error ? <CareButton title="Reload Note" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error ? editing ? <>
      <AppTextInput label="What would you like support with?" multiline maxLength={2000} editable={!action.busy} style={styles.note} value={text} onChangeText={setText} />
      <CareButton title={action.busy ? 'Saving...' : 'Save Note'} disabled={action.busy || !text.trim()} onPress={() => action.run(async () => {
        if (note) await updatePreSessionNote(appointmentId, text); else await createPreSessionNote(appointmentId, text);
        const savedText = text.trim();
        setNote(current => current ? { ...current, note: savedText } : { id: appointmentId, appointmentId, studentId: requireUserId(), note: savedText, createdAt: null, updatedAt: null });
        setText(savedText); setEditing(false); setNotice('Note saved.');
      })} />
      <CareButton title="Cancel Edit" secondary disabled={action.busy} onPress={() => { setText(note?.note ?? ''); setEditing(false); }} />
    </> : <>
      <AppText style={styles.small}>{note?.note || 'No note added. A note is optional.'}</AppText>
      <CareButton title={note ? 'Edit Note' : 'Add Note'} secondary disabled={action.busy} onPress={() => { setNotice(''); setEditing(true); }} />
      {note ? confirmDelete ? <><AppText accessibilityRole="alert">Delete this pre-session note?</AppText><CareButton danger title={action.busy ? 'Deleting...' : 'Delete Note'} disabled={action.busy} onPress={() => action.run(async () => { await deletePreSessionNote(appointmentId); setNote(null); setText(''); setConfirmDelete(false); setNotice('Note deleted.'); })} /><CareButton title="Keep Note" secondary disabled={action.busy} onPress={() => setConfirmDelete(false)} /></> : <CareButton danger compact title="Delete Note" secondary disabled={action.busy} onPress={() => setConfirmDelete(true)} /> : null}
    </> : null}
  </StudentCard>;
}
function RescheduleForm({ entry, action }: { entry: Appointment; action: ReturnType<typeof useAction> }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState({ appointmentDate: entry.appointmentDate, appointmentTime: entry.appointmentTime, sessionFormat: entry.sessionFormat });
  return <View style={styles.group}><SchedulePicker counselorId={entry.counselorId} value={schedule} onChange={setSchedule} disabled={action.busy} /><StatusMessage message={action.error} error /><CareButton title={action.busy ? 'Saving...' : 'Save Reschedule'} disabled={action.busy} onPress={() => action.run(async () => { await assertAvailableBooking({ ...schedule, counselorId: entry.counselorId }); await updateAppointment(entry.id, schedule); await handleAppointmentReminderEvent(entry.id, 'rescheduled'); router.replace('/student/appointments'); })} /></View>;
}
export function EditAppointmentScreen() {
  const router = useRouter();
  const record = useAppointment();
  const cancellation = useAction();
  const [now] = useState(() => Date.now());
  const editable = record.entry && ['booked', 'rescheduled'].includes(record.entry.status) && appointmentStart(record.entry).getTime() > now;
  return <StudentScreen title="Appointment Details">
    {record.loading ? <LoadingState /> : null}<StatusMessage message={record.error || cancellation.error} error />
    {record.error ? <CareButton title="Try again" secondary onPress={record.retry} /> : null}
    {record.entry ? <><AppointmentSummary {...record.entry} />
      {editable ? <RescheduleForm key={record.id} entry={record.entry} action={cancellation} /> : <AppText style={styles.small}>{record.entry.status === 'cancelled' ? 'Appointment cancelled.' : 'This appointment can be viewed but no longer rescheduled.'}</AppText>}
      {editable ? <CareButton danger compact secondary title={cancellation.busy ? 'Cancelling...' : 'Cancel Appointment'} disabled={cancellation.busy} onPress={() => cancellation.run(async () => { await cancelAppointment(record.id); record.setEntry(current => current ? { ...current, status: 'cancelled' } : current); await handleAppointmentReminderEvent(record.id, 'cancelled'); router.replace('/student/appointments'); })} /> : null}
      <AppointmentReminderStatus entry={record.entry} />
      <NoteEditor appointmentId={record.id} />
    </> : null}
    <CareButton title="Back to My Appointments" disabled={cancellation.busy} secondary onPress={() => router.replace('/student/appointments')} />
  </StudentScreen>;
}
