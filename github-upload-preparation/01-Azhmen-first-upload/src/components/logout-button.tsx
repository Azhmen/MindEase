import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthError } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { logoutUser } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/auth';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await logoutUser();
      router.replace('/login');
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  return (
    <View style={{ gap: Spacing.medium }}>
      <AuthError message={error} />
      <PrimaryButton style={{ backgroundColor: Colors.careAlert, borderWidth: 1, borderColor: Colors.careAlertBorder }} danger title={loading ? 'Logging out…' : 'Log out'} disabled={loading} onPress={handleLogout} />
    </View>
  );
}
