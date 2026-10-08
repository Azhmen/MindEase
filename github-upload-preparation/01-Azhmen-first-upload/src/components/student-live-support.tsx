import { BotanicalArt } from '@/components/presentation';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { StudentScreen, StatusMessage } from '@/components/student-screen';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LiveChatScreen } from '@/components/live-chat-screen';
import { getActiveCounselors, type ChatThread, type Counselor } from '@/services/chat';
import * as studentChat from '@/services/chat';
import * as anonymousChat from '@/services/anonymous-chat';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';

export function StudentLiveSupport({ anonymous = false }: { anonymous?: boolean }) {
  const service = anonymous ? anonymousChat : studentChat;
  const router = useRouter();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function listen() {
      try {
        const stop = await service.subscribeToStudentThread(data => { if (active) { setThread(data); setLoading(false); } }, err => { if (active) { setThread(null); setError(getAuthErrorMessage(err)); setLoading(false); } });
        if (active) unsubscribe = stop; else stop();
      }
      catch (err) { if (active) { setError(getAuthErrorMessage(err)); setLoading(false); } }
    }
    void listen();
    getActiveCounselors().then(data => { if (active) setCounselors(data); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setDirectoryLoading(false); });
    return () => { active = false; unsubscribe?.(); };
  }, [attempt, service]);
  async function start(counselorId?: string) {
    if (lock.current) return;
    lock.current = true; setStarting(true); setError('');
    try {
      if (counselorId) {
        await service.createOrGetChatThread(counselorId);
      } else {
        const options = await getActiveCounselors(); setCounselors(options);
        if (!options.length) throw new Error('No counselors are accepting new chats yet. Please contact campus support or check again later.');
        if (options.length === 1) await service.createOrGetChatThread(options[0].id);
        else setChoosing(true);
      }
      // The student's live thread listener opens the newly created conversation.
    } catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setStarting(false); }
  }
  if (thread) return <LiveChatScreen key={thread.id} role="student" anonymous={anonymous} threadId={thread.id} />;
  return <StudentScreen anonymous={anonymous} title="Live Support">
    <StudentCard style={{ backgroundColor: Colors.carePale, padding: 24, borderRadius: 32, boxShadow: 'none' }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><CareIcon name="chat" size={42} /><BotanicalArt size={100} /></View><AppText style={studentStyles.heading}>Talk to a Counselor</AppText><AppText style={studentStyles.muted}>A real conversation with someone who can listen. Take the first step when you are ready.</AppText>
      <View style={studentStyles.row}><CareIcon name="profile" size={18} /><AppText variant="caption" style={studentStyles.muted}>{directoryLoading ? 'Checking counselor availability...' : counselors.length ? counselors.length + ' active campus counselor' + (counselors.length === 1 ? '' : 's') : 'No active counselors listed'}</AppText></View>
      <AppText variant="caption" style={studentStyles.muted}>Directory availability is shown here. Replies may take time. Chat does not replace professional care or emergency support.</AppText>
      <CareButton title={starting ? 'Opening chat...' : 'Start Live Chat'} disabled={loading || directoryLoading || starting || !counselors.length} onPress={() => start()} />
    </StudentCard>
    {loading || directoryLoading || starting ? <ActivityIndicator color={Colors.careGreen} /> : null}<StatusMessage message={error} error />
    {choosing ? <><AppText style={studentStyles.section}>Choose your counselor</AppText>{counselors.map(counselor => <StudentCard key={counselor.id}><AppText style={studentStyles.section}>{counselor.name}</AppText>{counselor.title ? <AppText style={studentStyles.muted}>{counselor.title}</AppText> : null}<CareButton title="Start Chat" disabled={starting} onPress={() => start(counselor.id)} /></StudentCard>)}</> : null}
    <CareButton title="Refresh availability" secondary disabled={starting || loading || directoryLoading} onPress={() => { setError(''); setChoosing(false); setLoading(true); setDirectoryLoading(true); setAttempt(value => value + 1); }} />
    <StudentCard style={{ backgroundColor: Colors.careAlert, padding: 20 }}><AppText style={studentStyles.section}>Need immediate support?</AppText><AppText style={studentStyles.muted}>Live chat is not an emergency service. If you need urgent help, use trusted local or campus support.</AppText><CareButton title="Open Crisis Support" secondary onPress={() => router.push(anonymous ? '/anonymous/crisis-support' : '/student/crisis-support')} /></StudentCard>
  </StudentScreen>;
}
