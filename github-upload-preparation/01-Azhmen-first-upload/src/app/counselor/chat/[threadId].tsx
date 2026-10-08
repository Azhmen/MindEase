import { useLocalSearchParams } from 'expo-router';
import { LiveChatScreen } from '@/components/live-chat-screen';
export default function CounselorChatRoute() {
  const { threadId, anonymous } = useLocalSearchParams<{ threadId: string; anonymous?: string }>();
  return <LiveChatScreen key={threadId + anonymous} role="counselor" threadId={threadId} anonymous={anonymous === 'true'} />;
}
