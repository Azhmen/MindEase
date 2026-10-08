import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { CounselorFrame, CounselorHeader } from '@/components/counselor-ui';
import { StudentCard, CareButton, studentStyles } from '@/components/student-ui';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { StatusMessage, formatEntryDate } from '@/components/student-screen';
import { counselorConversationRoute, isAnonymousThread, useCounselorThreads } from '@/hooks/use-counselor-threads';

export default function CounselorChatsRoute() {
  const router = useRouter();
  const { threads, loading, error, reconnect } = useCounselorThreads();
  return <CounselorFrame>
    <CounselorHeader backTo="/counselor/dashboard" />
    <FlatList data={threads} keyExtractor={thread => (isAnonymousThread(thread) ? 'anonymous:' : 'student:') + thread.id} contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 12 }}
      ListHeaderComponent={<><AppText style={studentStyles.heading}>Student Chats</AppText><AppText style={studentStyles.muted}>Conversations assigned to you</AppText>{loading ? <ActivityIndicator /> : null}<StatusMessage message={error} error />{error ? <CareButton title="Reconnect" onPress={reconnect} /> : null}</>}
      ListEmptyComponent={!loading && !error ? <StudentCard><CareIcon name="chat" size={32} /><AppText style={studentStyles.section}>Your conversations start here</AppText><AppText style={studentStyles.muted}>No student conversations are assigned to you yet.</AppText></StudentCard> : null}
      renderItem={({ item }) => <StudentCard style={{ padding: 18, borderRadius: 22 }}><AppText style={studentStyles.section}>{isAnonymousThread(item) ? 'Anonymous Student' : 'Student conversation'}</AppText>{!isAnonymousThread(item) ? <AppText variant="caption" style={studentStyles.muted}>Assigned student</AppText> : null}<AppText numberOfLines={2}>{item.lastMessage || 'No messages yet.'}</AppText><AppText variant="caption" style={studentStyles.muted}>{formatEntryDate(item.lastMessageAt ?? item.createdAt)}</AppText><CareButton title="Open Conversation" compact secondary onPress={() => router.push(counselorConversationRoute(item))} /></StudentCard>} />
  </CounselorFrame>;
}
