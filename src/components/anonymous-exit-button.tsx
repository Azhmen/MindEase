import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { CareButton } from '@/components/student-ui';
import { StatusMessage } from '@/components/student-screen';
import { exitAnonymousSession } from '@/services/anonymous-session';
import { getAuthErrorMessage } from '@/utils/auth';

export function AnonymousExitButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function exit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await exitAnonymousSession(); router.replace('/login'); }
    catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8 }}><CareButton title={busy ? 'Leaving...' : 'Back to Login'} secondary disabled={busy} onPress={exit} /><StatusMessage message={error} error /></View>;
}
