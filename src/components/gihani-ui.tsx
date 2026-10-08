import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { getAuthErrorMessage } from '@/utils/auth';
export function useGihaniAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: () => Promise<void>, success = '') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); } catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, notice, run };
}
export const gihaniStyles = StyleSheet.create({
  group: { gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  text: { color: Colors.careMuted, fontSize: 14, lineHeight: 22 },
  mint: { backgroundColor: Colors.carePale },
  label: { color: Colors.careGreen, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  editor: { minHeight: 110, paddingVertical: 12, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 0, backgroundColor: Colors.careInput },
  selectedChip: { backgroundColor: Colors.careInput, borderColor: Colors.careGreen },
  original: { backgroundColor: Colors.careAmber, borderRadius: 16, borderWidth: 0, padding: 16, gap: 8, marginTop: 8 },
});
