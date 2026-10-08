import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

export type AvailabilityPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const availabilityPickerStyles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: Colors.careGreen, fontWeight: '500', fontSize: 13 },
  field: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.careInput, borderWidth: 1, borderColor: Colors.careBorder, borderRadius: BorderRadius.large, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { color: Colors.text, fontSize: 15, flexShrink: 1 },
  placeholder: { color: Colors.placeholder },
  disabled: { opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, maxHeight: '80%', alignSelf: 'center', backgroundColor: Colors.surface, borderRadius: 24, padding: 20, gap: 16 },
  option: { minHeight: 48, padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selected: { backgroundColor: Colors.carePale },
});
