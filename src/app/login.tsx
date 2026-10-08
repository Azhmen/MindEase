import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AuthError } from '@/components/auth-screen';
import { CareIcon } from '@/components/care-icon';
import { CareDivider, CareField, CareLoginLayout, RoleSelector, careLoginStyles as styles } from '@/components/care-login-layout';
import { AppText } from '@/components/text';
import { Colors } from '@/constants/colors';
import { loginUser, logoutUser } from '@/services/auth';
import { startAnonymousSession } from '@/services/anonymous-session';
import { getUserProfile, type UserRole } from '@/services/user-profile';
import { getAuthErrorMessage, getRoleRoute, isValidEmail } from '@/utils/auth';

export default function LoginRoute() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enteringAnonymous, setEnteringAnonymous] = useState(false);
  const authLock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Returning to Login should not retain a notice from an earlier interaction.
  useFocusEffect(useCallback(() => {
    setNotice('');
  }, []));

  // TODO: Implement each integration independently. These controls do not change Firebase state.
  function placeholder(feature: string) {
    setNotice(`${feature} is coming soon.`);
  }

  async function handleLogin() {
    if (authLock.current) return;
    setError('');
    setNotice('');
    if (!isValidEmail(email.trim()) || !password) {
      setError('Enter your university email and password. Student ID sign-in is not available yet.');
      return;
    }
    authLock.current = true; setLoading(true);
    try {
      const credential = await loginUser(email.trim(), password);
      const profile = await getUserProfile(credential.user.uid);
      if (!profile) throw new Error('Your user profile is missing. Please contact support.');
      if (profile.role !== role) {
        // Do not leave a mismatched account signed in or route it to the selected destination.
        await logoutUser();
        throw new Error(`This account does not match the selected ${role} role. Select the correct role and sign in again.`);
      }
      router.replace(getRoleRoute(profile.role));
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      authLock.current = false;
      setLoading(false);
    }
  }

  async function handleAnonymous() {
    if (authLock.current) return;
    authLock.current = true;
    setLoading(true); setEnteringAnonymous(true); setError(''); setNotice('');
    try { await startAnonymousSession(); router.replace('/anonymous/home'); }
    catch (error) { setError(getAuthErrorMessage(error)); }
    finally { authLock.current = false; setLoading(false); setEnteringAnonymous(false); }
  }

  return (
    <CareLoginLayout>
      <View style={styles.card}>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => placeholder('Campus Portal SSO')} style={styles.pill}>
          <CareIcon name="portal" /><AppText variant="caption" style={styles.pillText}>Sign in with Campus Portal (SSO)</AppText>
        </Pressable>
        <RoleSelector role={role} disabled={loading} onChange={value => { setRole(value); setError(''); setNotice(''); }} />
        <CareDivider text={role === 'student' ? 'or with Student ID' : 'or with Counselor ID'} />
        <CareField label="Email or ID" icon="id" placeholder="e.g. alex@university.edu" value={email} onChangeText={value => { setEmail(value); setNotice(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!loading} />
        <CareField label="Password" icon="lock" placeholder="Enter your password" value={password} onChangeText={value => { setPassword(value); setNotice(''); }} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" editable={!loading} onSubmitEditing={handleLogin}
          action={<Pressable accessibilityRole="button" disabled={loading} onPress={() => placeholder('Password recovery')} style={styles.linkTouch} hitSlop={8}><AppText style={styles.smallLink}>Forgot password?</AppText></Pressable>}
          trailing={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} disabled={loading} onPress={() => setShowPassword(!showPassword)} style={styles.touch}><CareIcon name={showPassword ? 'eyeOff' : 'eye'} color={Colors.careMuted} /></Pressable>} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel="Remember this verified device. Not available yet." disabled={loading} onPress={() => placeholder('Remember device')} style={styles.remember}>
          <View style={styles.checkbox} /><AppText variant="caption" style={styles.muted}>Remember this verified device</AppText>
        </Pressable>
        <AuthError message={error} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={handleLogin} style={[styles.signIn, loading && styles.disabled]}>
          {loading && !enteringAnonymous ? <ActivityIndicator color={Colors.onPrimary} /> : null}<AppText variant="caption" style={styles.signInText}>{loading && !enteringAnonymous ? 'Signing in...' : 'Sign In'}</AppText>{!loading ? <CareIcon name="arrow" color={Colors.onPrimary} size={16} /> : null}
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Don't have an account? Create Account" disabled={loading} onPress={() => router.push('/register')} style={[styles.pill, loading && styles.disabled]}>
        <AppText style={styles.pillText}>Don&apos;t have an account? Create Account</AppText>
      </Pressable>
      <CareDivider text="prefer not to log in?" />
      <View style={styles.anonymous}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: enteringAnonymous }} disabled={loading} onPress={handleAnonymous} style={[styles.pill, loading && styles.disabled]}>
          {enteringAnonymous ? <ActivityIndicator color={Colors.careGreen} /> : <CareIcon name="anonymous" />}<AppText variant="caption" style={styles.pillText}>{enteringAnonymous ? 'Entering anonymous mode...' : 'Continue Anonymously'}</AppText>
        </Pressable>
        <AppText variant="caption" style={styles.muted}>No name, email or student ID collected. An anonymous Firebase UID securely isolates your session.</AppText>
      </View>
      {notice ? <AppText variant="caption" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    </CareLoginLayout>
  );
}
