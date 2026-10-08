// Web implementation; Metro selects .native.tsx on Android and iOS.
import { useRef } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/text';
import { localDateString } from '@/constants/booking';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { availabilityPickerStyles as styles, type AvailabilityPickerProps } from './availability-picker-ui';

export function AvailabilityDatePicker({ value, onChange, disabled }: AvailabilityPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const today = localDateString(new Date());
  return <View style={styles.group}>
    <AppText style={styles.label}>Date</AppText>
    <input ref={input} aria-label="Date" type="date" value={value} min={today} disabled={disabled}
      onClick={() => { try { input.current?.showPicker?.(); } catch { /* Browser's normal date control remains available. */ } }}
      onChange={event => { const date = event.target.value; if (!date || date >= localDateString(new Date())) onChange(date); }}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 52, padding: '12px 16px', borderRadius: 14, border: `1px solid ${Colors.careBorder}`, backgroundColor: Colors.careInput, color: Colors.text, fontFamily: Typography.fontFamily.body, fontSize: 15, colorScheme: 'light', opacity: disabled ? 0.5 : 1 }} />
  </View>;
}
