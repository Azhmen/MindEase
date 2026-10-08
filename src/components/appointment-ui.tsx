import { StatusChip } from '@/components/wellness-ui';
import { FormPanel, presentation } from '@/components/presentation';
import { LoadingState } from '@/components/student-screen';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAvailableSlotsForBooking, type AvailabilitySlot } from '@/services/counselor-management';
import { getAuthErrorMessage } from '@/utils/auth';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { CareIcon } from '@/components/care-icon';
import { StudentCard, studentStyles } from '@/components/student-ui';
import { Colors } from '@/constants/colors';
import { bookingDateLabel, suggestedBookingDates, SUPPORT_TOPICS } from '@/constants/booking';
import type { BookingDetails } from '@/services/appointments';

export function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.selected]}><AppText style={[styles.choiceText, selected && styles.selectedText]}>{label}</AppText></Pressable>;
}
export function SchedulePicker({ counselorId, value, onChange, disabled = false }: { counselorId: string; value: Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>; onChange: (value: Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>) => void; disabled?: boolean }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => { void attempt; let active = true; setSlots([]); setError(''); if (!counselorId) { setLoading(false); return; } setLoading(true);
    getAvailableSlotsForBooking(counselorId).then(result => { if (active) setSlots(result); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [counselorId, attempt]));
  const dates = slots.length ? [...new Set(slots.map(slot => slot.date))].map(date => ({ value: date, label: bookingDateLabel(date) })) : suggestedBookingDates();
  const matching = slots.filter(slot => slot.date === value.appointmentDate && slot.mode === (value.sessionFormat === 'Virtual' ? 'virtual' : 'in_person'));
  return <View style={styles.group}>
    <FormPanel tone="lavender"><AppText style={studentStyles.section}>Session format</AppText>
    <View style={styles.wrap}>{(['Virtual', 'In-Person'] as const).map(format => <Choice key={format} label={format} selected={value.sessionFormat === format} disabled={disabled} onPress={() => onChange({ ...value, sessionFormat: format })} />)}</View>
    <AppText style={studentStyles.muted}>Meeting links and campus locations are not configured yet.</AppText></FormPanel>
    <FormPanel><AppText style={studentStyles.section}>Choose a date</AppText>
    <View style={styles.wrap}>{dates.map(date => <Choice key={date.value} label={date.label} selected={value.appointmentDate === date.value} disabled={disabled} onPress={() => onChange({ ...value, appointmentDate: date.value })} />)}</View>
    <AppTextInput label="Other date (YYYY-MM-DD)" value={value.appointmentDate} editable={!disabled} maxLength={10} autoCapitalize="none" placeholder="YYYY-MM-DD" onChangeText={appointmentDate => onChange({ ...value, appointmentDate })} />
    </FormPanel><FormPanel tone="mint"><AppText style={studentStyles.section}>Choose a time</AppText>
    <AppText style={styles.small}>Published counselor availability. Selection does not reserve or lock a slot; confirm arrangements with campus support.</AppText>
    {loading ? <LoadingState /> : null}{error ? <Pressable accessibilityRole="button" onPress={() => setAttempt(v => v + 1)}><AppText accessibilityRole="alert">{error} · Tap to retry</AppText></Pressable> : null}
    {!counselorId ? <AppText style={studentStyles.muted}>Select a counselor first.</AppText> : !loading && !error && !matching.length ? <AppText style={studentStyles.muted}>No available slots for this date and format.</AppText> : null}
    <View style={styles.wrap}>{matching.map(slot => <Choice key={slot.id} label={slot.startTime + ' · ' + slot.endTime + (slot.location ? ' · ' + slot.location : '')} selected={value.appointmentTime === slot.startTime} disabled={disabled} onPress={() => onChange({ ...value, appointmentTime: slot.startTime })} />)}</View>
  </FormPanel></View>;
}
export function TopicsPicker({ selected, onChange }: { selected: string[]; onChange: (value: string[]) => void }) {
  return <View style={styles.wrap}>{SUPPORT_TOPICS.map(topic => <Choice key={topic} label={topic} selected={selected.includes(topic)} onPress={() => onChange(selected.includes(topic) ? selected.filter(item => item !== topic) : [...selected, topic])} />)}</View>;
}
export function AppointmentSummary({ counselorName, appointmentDate, appointmentTime, sessionFormat, status, embedded = false }: { counselorName: string; status?: string; embedded?: boolean } & Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>) {
  const Container = embedded ? View : StudentCard;
  return <Container style={embedded ? styles.summary : styles.ticket}>
    <View style={studentStyles.row}><View style={styles.ticketAvatar}><CareIcon name="profile" size={24} /></View><View style={studentStyles.flex}><AppText style={styles.date}>{counselorName}</AppText><AppText style={styles.small}>Campus Care</AppText></View></View>
    <View style={presentation.inset}><View style={studentStyles.row}><CareIcon name="calendar" size={18} /><AppText style={[styles.date, studentStyles.flex]}>{bookingDateLabel(appointmentDate)}</AppText></View><View style={studentStyles.row}><CareIcon name="clock" size={18} /><AppText style={styles.time}>{appointmentTime}</AppText></View></View>
    <View style={styles.wrap}><StatusChip label={sessionFormat} tone="blue" />{status ? <StatusChip label={status} /> : null}</View>
  </Container>;
}
export const appointmentStyles = StyleSheet.create({
  summary: { gap: 12 }, ticket: { borderRadius: 22, gap: 12, padding: 18 }, ticketAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' }, date: { color: Colors.careGreen, fontSize: 16, fontWeight: '600' }, time: { color: Colors.careGreen, fontSize: 18, lineHeight: 26 }, group: { gap: 16 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 40, justifyContent: 'center', borderWidth: 0, backgroundColor: Colors.careInput, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  selected: { backgroundColor: Colors.careGreen, borderColor: Colors.careGreen },
  choiceText: { color: Colors.careGreen, fontSize: 13, lineHeight: 20 }, selectedText: { color: Colors.onPrimary, fontWeight: '600' },
  mint: { backgroundColor: Colors.carePale }, small: { color: Colors.careMuted, fontSize: 12, lineHeight: 19 },
  note: { minHeight: 140, paddingVertical: 14, textAlignVertical: 'top' },
  status: { alignSelf: 'flex-start', backgroundColor: Colors.carePale, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, color: Colors.careGreen, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
const styles = appointmentStyles;
