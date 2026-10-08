import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareButton } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { availabilityTimeOptions } from '@/utils/availability-form';
import { availabilityPickerStyles as styles, type AvailabilityPickerProps } from './availability-picker-ui';

export function AvailabilityTimePicker({ label, value, onChange, disabled }: AvailabilityPickerProps & { label: string }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.group}>
    <AppText style={styles.label}>{label}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Select time'}`} accessibilityState={{ expanded: open, disabled: !!disabled }}
      disabled={disabled} onPress={() => setOpen(true)} style={[styles.field, disabled && styles.disabled]}>
      <AppText style={[styles.value, !value && styles.placeholder]}>{value || 'Select time'}</AppText><CareIcon name="down" size={20} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.dialog}><AppText style={styles.label}>{label}</AppText>
        <ScrollView>{availabilityTimeOptions(value).map(time => <Pressable key={time} accessibilityRole="radio" accessibilityState={{ checked: time === value }} accessibilityLabel={time}
          onPress={() => { onChange(time); setOpen(false); }} style={[styles.option, time === value && styles.selected]}>
          <AppText style={styles.value}>{time}</AppText>{time === value ? <CareIcon name="check" size={16} /> : null}
        </Pressable>)}</ScrollView>
        <CareButton title="Cancel" secondary onPress={() => setOpen(false)} />
      </View></View>
    </Modal>
  </View>;
}
