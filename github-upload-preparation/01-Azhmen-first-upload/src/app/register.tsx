import { useRouter } from 'expo-router';
import type { User } from 'firebase/auth';
import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { AppCard } from '@/components/app-card';
import { AppTextInput } from '@/components/app-text-input';
import { AuthError, AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { AppText } from '@/components/text';
import { RoleSelector, careLoginStyles } from '@/components/care-login-layout';
import { registerUser } from '@/services/auth';
import { createUserProfile, type UserRole } from '@/services/user-profile';
import { getAuthErrorMessage, getRoleRoute, isValidEmail } from '@/utils/auth';

export default function RegisterRoute() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Keep the account so a failed profile write can be retried without registering twice.
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const lock = useRef(false);
  const editable = !loading && !createdUser;

  async function handleRegister() {
    if (lock.current) return;
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (name.trim().length > 100) { setError('Keep your name within 100 characters.'); return; }
    if (!isValidEmail(email.trim())) { setError('Please enter a valid email address.'); return; }
    if (password.trim().length < 6) { setError('Your password must have at least 6 characters.'); return; }
    if (password.trim() !== confirmPassword.trim()) { setError('Passwords do not match.'); return; }
    if (!['student', 'counselor'].includes(role)) { setError('Please select Student or Counselor.'); return; }
    lock.current = true;
    setLoading(true);
    let user = createdUser;
    try {
      if (!user) {
        const credential = await registerUser(email.trim(), password.trim());
        user = credential.user;
        setCreatedUser(user);
      }
      await createUserProfile({ uid: user.uid, name: name.trim(), email: user.email ?? email.trim(), role });
      router.replace(getRoleRoute(role));
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setError(user ? `Your account was created, but your profile could not be saved. ${message} Tap Retry profile to finish.` : message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="Create Account">
      <AppText variant="caption" style={careLoginStyles.muted}>Your campus wellbeing space starts here.</AppText>
      <AppCard>
        <AppTextInput label="Full Name" value={name} onChangeText={setName} maxLength={100} autoComplete="name" editable={editable} />
        <AppTextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={editable} />
        <AppTextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={editable} />
        <AppText variant="caption" style={careLoginStyles.muted}>Use at least 6 characters.</AppText>
        <AppTextInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={editable} onSubmitEditing={handleRegister} />
        <RoleSelector role={role} disabled={!editable} onChange={setRole} />
        {role === 'counselor' ? <AppText variant="caption" style={careLoginStyles.muted}>Your campus administrator must activate your counselor directory entry before students can select you for booking or live chat.</AppText> : null}
        <AuthError message={error} />
        <PrimaryButton title={loading ? 'Creating account...' : createdUser ? 'Retry profile' : 'Create Account'} onPress={handleRegister} disabled={loading} />
      </AppCard>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => router.replace('/login')} style={careLoginStyles.pill}><AppText style={careLoginStyles.pillText}>Already have an account? Sign In</AppText></Pressable>
    </AuthScreen>
  );
}

