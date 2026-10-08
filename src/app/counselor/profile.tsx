import { BotanicalArt } from '@/components/presentation';
import { FeatureBanner, StatusChip } from '@/components/wellness-ui';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CounselorScreen } from '@/components/counselor-ui';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { StatusMessage } from '@/components/student-screen';
import { LogoutButton } from '@/components/logout-button';
import { COUNSELOR_PROFILE_LIMITS, getCurrentCounselorProfile, updateCurrentCounselorProfile, type CounselorProfileInput, type UserProfile } from '@/services/user-profile';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';

const fields = [
  { key: 'name', label: 'Name', placeholder: 'Your name' },
  { key: 'title', label: 'Professional Title', placeholder: 'Your professional title' },
  { key: 'specialization', label: 'Specialization', placeholder: 'Your areas of practice' },
  { key: 'officeLocation', label: 'Office / Location', placeholder: 'Campus office or location' },
  { key: 'phoneExtension', label: 'Phone Extension', placeholder: 'Optional campus extension' },
  { key: 'bio', label: 'Short Bio', placeholder: 'A little about your work and approach' },
] as const;
function profileDraft(profile: UserProfile): CounselorProfileInput {
  return { name: profile.name, title: profile.title ?? '', specialization: profile.specialization ?? '', officeLocation: profile.officeLocation ?? '', phoneExtension: profile.phoneExtension ?? '', bio: profile.bio ?? '' };
}
export default function CounselorProfileRoute() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<CounselorProfileInput>({ name: '' });
  const [loading, setLoading] = useState(true), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    void attempt; let active = true; setLoading(true); setError(''); setNotice(''); setEditing(false); setProfile(null);
    getCurrentCounselorProfile().then(value => { if (active) { setProfile(value); setDraft(profileDraft(value)); } }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  async function save() {
    if (lock.current || !profile) return;
    lock.current = true; setSaving(true); setError(''); setNotice('');
    try {
      const saved = await updateCurrentCounselorProfile(draft, profile.uid);
      setProfile({ ...profile, ...saved }); setDraft(saved); setEditing(false); setNotice('Profile updated.');
    } catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setSaving(false); }
  }
  const initials = profile?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <CounselorScreen title="Counselor Profile">
    {loading ? <ActivityIndicator color={Colors.careGreen} /> : null}
    <StatusMessage message={error} error /><StatusMessage message={notice} />
    {!loading && !profile ? <CareButton title="Reload Profile" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {profile ? <>
      <StudentCard style={styles.profileCard}><View style={[styles.art, { pointerEvents: 'none' }]}><BotanicalArt size={150} light /></View>
        <View style={styles.avatar}><AppText style={styles.initials}>{initials || 'C'}</AppText></View>
        <AppText style={styles.name}>{profile.name}</AppText>
        <StatusChip label={profile.title?.trim() || 'Counselor'} tone="mint" />
        {profile.specialization?.trim() ? <AppText style={styles.specialization}>{profile.specialization}</AppText> : null}
        <AppText style={styles.email}>{profile.email}</AppText><AppText style={styles.role}>Counselor · Email and role are read-only</AppText>
      </StudentCard>
      <StudentCard>
        <AppText style={studentStyles.section}>Professional Details</AppText>
        {editing ? <>
          <AppText style={styles.muted}>Only name is required. Your name, title and specialization appear in the public counselor directory.</AppText>
          {fields.map(field => <AppTextInput key={field.key} label={field.label} placeholder={field.placeholder} value={draft[field.key] ?? ''} editable={!saving} maxLength={COUNSELOR_PROFILE_LIMITS[field.key]} multiline={field.key === 'bio'} style={field.key === 'bio' ? styles.bioInput : undefined} onChangeText={value => setDraft(current => ({ ...current, [field.key]: value }))} />)}
          <CareButton title={saving ? 'Saving...' : 'Save Changes'} disabled={saving} onPress={save} />
          <CareButton title="Cancel" secondary disabled={saving} onPress={() => { setDraft(profileDraft(profile)); setEditing(false); setError(''); setNotice(''); }} />
        </> : <>
          {fields.filter(field => field.key !== 'name').map(field => <View key={field.key} style={styles.detail}><AppText style={styles.label}>{field.label}</AppText><AppText style={styles.value}>{profile[field.key]?.trim() || 'Not provided'}</AppText></View>)}
          <CareButton title="Edit Profile" onPress={() => { setDraft(profileDraft(profile)); setEditing(true); setNotice(''); setError(''); }} />
        </>}
      </StudentCard>
    </> : null}
    <FeatureBanner title="Support Options" description="Find platform guidance, helpful information and common answers." icon="book" tone="blue"><CareButton title="Open Support Options" secondary onPress={() => router.push('/counselor/support')} /></FeatureBanner>
    <LogoutButton />
  </CounselorScreen>;
}
const styles = StyleSheet.create({
  art: { position: 'absolute', right: -32, top: -24, opacity: 0.15 },
  profileCard: { overflow: 'hidden', backgroundColor: Colors.careGreen, borderRadius: 22, alignItems: 'center', gap: 8, paddingVertical: 24 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.careBorder },
  initials: { fontSize: 22, color: Colors.careGreen, fontWeight: '600' },
  name: { fontSize: 22, lineHeight: 30, color: Colors.onPrimary, fontWeight: '700', textAlign: 'center' },
  title: { color: Colors.careGreen, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  specialization: { color: Colors.carePale, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  email: { color: Colors.carePale, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  role: { color: Colors.carePale, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  detail: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.careBorder }, label: { fontSize: 12, lineHeight: 16, color: Colors.careMuted }, value: { fontSize: 13, lineHeight: 20, color: Colors.careGreen },
  muted: { color: Colors.careMuted, fontSize: 12, lineHeight: 19 }, bioInput: { minHeight: 120, textAlignVertical: 'top', paddingVertical: 12 },
});
