import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { AppText } from '@/components/text';
import { CareButton } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { localDateString, bookingDateLabel } from '@/constants/booking';
import { Colors } from '@/constants/colors';
import { availabilityPickerStyles as styles, type AvailabilityPickerProps } from './availability-picker-ui';

export function AvailabilityDatePicker({ value, onChange, disabled }: AvailabilityPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const select = (date: Date) => {
    if (localDateString(date) >= localDateString(new Date())) onChange(localDateString(date));
    setOpen(false);
  };
  const picker = <DateTimePicker value={draft} minimumDate={today} mode="date" accentColor={Colors.careGreen}
    display={Platform.OS === 'ios' ? 'inline' : 'calendar'} presentation="dialog"
    onValueChange={(_, date) => { if (Platform.OS === 'android') select(date); else setDraft(date); }}
    onDismiss={() => setOpen(false)} />;
  return <View style={styles.group}>
    <AppText style={styles.label}>Date</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `Date: ${value}` : 'Select date'} disabled={disabled}
      onPress={() => { const selected = value ? new Date(value + 'T12:00:00') : today; setDraft(selected < today ? today : selected); setOpen(true); }}
      style={[styles.field, disabled && styles.disabled]}>
      <AppText style={[styles.value, !value && styles.placeholder]}>{value ? bookingDateLabel(value) : 'Select date'}</AppText><CareIcon name="clock" size={18} />
    </Pressable>
    {open && Platform.OS === 'android' ? picker : null}
    {Platform.OS === 'ios' ? <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.dialog}><AppText style={styles.label}>Select date</AppText>{open ? picker : null}<CareButton title="Use Date" onPress={() => select(draft)} /><CareButton title="Cancel" secondary onPress={() => setOpen(false)} /></View></View>
    </Modal> : null}
  </View>;
}
