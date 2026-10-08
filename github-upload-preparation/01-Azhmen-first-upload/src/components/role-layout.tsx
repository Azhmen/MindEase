import { onAuthStateChanged } from 'firebase/auth';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { auth } from '@/config/firebase';
import { ScreenContainer } from '@/components/screen-container';
import { AppText } from '@/components/text';
import { PrimaryButton } from '@/components/primary-button';
import { LogoutButton } from '@/components/logout-button';
import { getUserProfile, type UserRole } from '@/services/user-profile';
import { getAuthErrorMessage, getRoleRoute } from '@/utils/auth';

export function RoleLayout({ role }: { role: UserRole }) {
  const [state, setState] = useState<'loading' | 'student' | 'counselor' | 'signed-out' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let version = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++version;
      setState('loading');
      if (!user || user.isAnonymous) { setState('signed-out'); return; }
      try {
        const profile = await getUserProfile(user.uid);
        if (current !== version) return;
        if (!profile || !['student', 'counselor'].includes(profile.role)) throw new Error('Your user profile is missing or invalid. Please contact support.');
        setState(profile.role);
      } catch (err) {
        if (current === version) { setError(getAuthErrorMessage(err)); setState('error'); }
      }
    });
    return () => { version++; unsubscribe(); };
  }, [attempt]);
  if (state === 'signed-out') return <Redirect href="/login" />;
  if (state === 'loading') return <ScreenContainer><ActivityIndicator /><AppText>Loading your {role} space...</AppText></ScreenContainer>;
  if (state === 'error') return <ScreenContainer><AppText>{error}</AppText><PrimaryButton title="Try again" onPress={() => setAttempt(value => value + 1)} /><LogoutButton /></ScreenContainer>;
  if (state !== role) return <Redirect href={getRoleRoute(state)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
