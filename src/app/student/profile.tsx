import { BotanicalArt } from '@/components/presentation';
import { SettingsRow, StatTile, StatusChip, wellnessLayout } from '@/components/wellness-ui';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';

import { AppTextInput } from '@/components/app-text-input';

import { Colors } from '@/constants/colors';

import { LogoutButton } from '@/components/logout-button';

import { LoadingState, StudentScreen, StatusMessage } from '@/components/student-screen';

import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';

import { getCurrentUser } from '@/services/auth';

import { getUserProfile, updateCurrentStudentProfile, STUDENT_PROFILE_LIMITS, type StudentProfileInput, type UserProfile } from '@/services/user-profile';

import { getAuthErrorMessage } from '@/utils/auth';

import { NotificationPreferences } from '@/components/notification-preferences';



export default function ProfileRoute() {

  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [draft, setDraft] = useState<StudentProfileInput>({ name: '' });

  const [loading, setLoading] = useState(true), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);

  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [attempt, setAttempt] = useState(0);

  const lock = useRef(false);

  useEffect(() => {

    let active = true;

    async function load() {

      try {

        const user = getCurrentUser();

        if (!user || user.isAnonymous) throw new Error('Please sign in to view your student profile.');

        const data = await getUserProfile(user.uid);

        if (!data || data.role !== 'student') throw new Error('Your student profile could not be loaded.');

        if (active && getCurrentUser()?.uid === user.uid) setProfile(data);

      } catch (err) { if (active) setError(getAuthErrorMessage(err)); }

      finally { if (active) setLoading(false); }

    }

    void load();

    return () => { active = false; };

  }, [attempt]);

  function edit() {

    if (!profile) return;

    setDraft({ name: profile.name, preferredName: profile.preferredName ?? '', faculty: profile.faculty ?? '', yearOfStudy: profile.yearOfStudy ?? '' });

    setError(''); setNotice(''); setEditing(true);

  }

  async function save() {

    if (lock.current || !profile) return;

    lock.current = true; setSaving(true); setError('');

    try {

      const fields = await updateCurrentStudentProfile(draft, profile.uid);

      setProfile(current => current ? { ...current, ...fields } : current);

      setEditing(false); setNotice('Profile updated.');

    } catch (err) { console.error('Save student profile', err); setError(getAuthErrorMessage(err)); }

    finally { lock.current = false; setSaving(false); }

  }

  return <StudentScreen title="Student Profile" eyebrow="YOUR CAMPUS CARE">

    {loading ? <LoadingState /> : null}<StatusMessage message={error} error /><StatusMessage message={notice} />

    {!profile && error ? <CareButton title="Try again" secondary onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} /> : null}

    {profile ? <>

      <StudentCard style={styles.identity}><View style={[styles.art, { pointerEvents: 'none' }]}><BotanicalArt size={150} light /></View><View style={styles.avatar}><AppText style={styles.initial}>{profile.name.trim().charAt(0).toUpperCase()}</AppText></View><AppText style={{ color: Colors.onPrimary, fontSize: 22, lineHeight: 30, fontWeight: '700', textAlign: 'center' }}>{profile.name}</AppText><AppText style={{ color: Colors.carePale, fontSize: 13, lineHeight: 20, textAlign: 'center', width: '100%' }}>{profile.email}</AppText><StatusChip label="Student · Campus Care" tone="mint" /></StudentCard>

      <View style={wellnessLayout.stats}><StatTile label="Faculty" value={profile.faculty || 'Not set'} tone="blue" /><StatTile label="Year of study" value={profile.yearOfStudy || 'Not set'} tone="lavender" /></View>

      <StudentCard><AppText style={studentStyles.label}>ACCOUNT</AppText>

        {editing ? <>

          {(Object.keys(STUDENT_PROFILE_LIMITS) as (keyof StudentProfileInput)[]).map(key => <AppTextInput key={key} label={{ name: 'Full Name', faculty: 'Faculty', yearOfStudy: 'Year of Study (1–8, optional)', preferredName: 'Preferred Name (optional)' }[key]} value={draft[key] ?? ''} maxLength={STUDENT_PROFILE_LIMITS[key]} keyboardType={key === 'yearOfStudy' ? 'number-pad' : 'default'} editable={!saving} onChangeText={value => setDraft(current => ({ ...current, [key]: value }))} />)}

          <AppText style={studentStyles.muted}>Email and account role cannot be changed here.</AppText>

          <CareButton title={saving ? 'Saving changes...' : 'Save Changes'} disabled={saving} onPress={() => void save()} /><CareButton title="Cancel" secondary disabled={saving} onPress={() => { setEditing(false); setError(''); }} />

        </> : <><AppText style={studentStyles.muted}>Preferred name: {profile.preferredName || 'Not set'}</AppText><AppText style={studentStyles.muted}>Faculty: {profile.faculty || 'Not set'}</AppText><AppText style={studentStyles.muted}>Year of study: {profile.yearOfStudy || 'Not set'}</AppText><CareButton title="Edit Profile" secondary onPress={edit} /></>}

      </StudentCard>

      <StudentCard><AppText style={studentStyles.label}>CARE & ACTIVITIES</AppText><SettingsRow title="My Appointments" icon="clock" onPress={() => router.push('/student/appointments')} /><SettingsRow title="Saved Resources" icon="book" onPress={() => router.push('/student/resources/saved')} /><SettingsRow title="Mood History" icon="good" onPress={() => router.push('/student/mood/history')} /></StudentCard>

      <AppText style={studentStyles.label}>PREFERENCES</AppText><NotificationPreferences key={profile.uid} profile={profile} />

      <StudentCard><AppText style={studentStyles.label}>PRIVACY & SECURITY</AppText><SettingsRow title="Privacy & Data Information" icon="lock" onPress={() => router.push('/student/privacy')} /><AppText style={studentStyles.muted}>Anonymous mode uses a separate anonymous Firebase UID. It does not collect your name, email or student ID, or automatically link session data to this account.</AppText></StudentCard>

      <StudentCard><AppText style={studentStyles.label}>SUPPORT</AppText><SettingsRow title="Support Options" icon="chat" onPress={() => router.push('/student/support')} /><SettingsRow title="Crisis Support" icon="shield" danger onPress={() => router.push('/student/crisis-support')} /></StudentCard>

    </> : null}

    <LogoutButton />

  </StudentScreen>;

}

const styles = StyleSheet.create({ art: { position: 'absolute', right: -32, top: -24, opacity: 0.15 }, identity: { overflow: 'hidden', borderRadius: 22, backgroundColor: Colors.careGreen, alignItems: 'center', paddingVertical: 24 }, avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 28, fontWeight: '700', color: Colors.careGreen }, badge: { color: Colors.careGreen, fontSize: 12, fontWeight: '600' } });

