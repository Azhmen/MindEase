import { onAuthStateChanged } from 'firebase/auth';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { auth } from '@/config/firebase';
import { getAnonymousSession } from '@/services/anonymous-session';
import { ScreenContainer } from '@/components/screen-container';
import { AppText } from '@/components/text';
import { getAuthErrorMessage } from '@/utils/auth';
import { AnonymousExitButton } from '@/components/anonymous-exit-button';

export default function AnonymousLayout() {
  const pathname = usePathname();
  const [state, setState] = useState<'loading' | 'ready' | 'signed-out' | 'error'>('loading');
  const [error, setError] = useState('');
  useEffect(() => {
    let version = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++version;
      if (!user?.isAnonymous) { setState('signed-out'); return; }
      try { await getAnonymousSession(); if (current === version) setState('ready'); }
      catch (err) { if (current === version) { setError(getAuthErrorMessage(err)); setState('error'); } }
    });
    return () => { version++; unsubscribe(); };
  }, []);
  // Informational crisis support is also available without any Firebase session.
  if (pathname === '/anonymous/crisis-support') return <Stack screenOptions={{ headerShown: false }} />;
  if (state === 'signed-out') return <Redirect href="/login" />;
  if (state === 'loading') return <ScreenContainer><ActivityIndicator /><AppText>Opening your guest space...</AppText></ScreenContainer>;
  if (state === 'error') return <ScreenContainer><AppText>{error}</AppText><AnonymousExitButton /></ScreenContainer>;
  return <Stack screenOptions={{ headerShown: false }} />;
}
