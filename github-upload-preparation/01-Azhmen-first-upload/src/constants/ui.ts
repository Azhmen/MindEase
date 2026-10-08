import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

// Presentation tokens shared by student, anonymous and counselor screens.
export const UI = {
  page: { padding: 20, paddingBottom: 24, gap: 20 },
  card: { padding: 18, borderRadius: 22, gap: 12, borderWidth: 0, backgroundColor: Colors.surface, boxShadow: '0 3px 12px ' + Colors.careShadow },
  button: { minHeight: 50, borderRadius: 14, paddingHorizontal: Spacing.medium, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  smallButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  input: { minHeight: 52, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.careBorder, backgroundColor: Colors.careInput, color: Colors.text, fontSize: 15 },
  section: { color: Colors.careGreen, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  title: { color: Colors.careGreen, fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
} as const;
