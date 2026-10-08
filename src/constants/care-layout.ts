import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

// Shared visual primitives only; navigation and screen behavior stay with each role.
export const CareLayout = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.careBackground },
  nav: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, padding: 8, borderRadius: 22, backgroundColor: Colors.surface, boxShadow: '0 -2px 20px ' + Colors.careShadow },
  tab: { flex: 1, alignItems: 'center', minHeight: 50, gap: 2 },
  tabIcon: { minWidth: 48, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  tabLabel: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
});
