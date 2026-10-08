import { useRouter } from 'expo-router';
import { CounselorScreen } from '@/components/counselor-ui';
import { CrisisSupportContent } from '@/components/crisis-support-content';
import { CareButton } from '@/components/student-ui';

export default function CounselorCrisisSupportRoute() {
  const router = useRouter();
  return <CounselorScreen title="Immediate Support"><CrisisSupportContent /><CareButton title="Back to Dashboard" onPress={() => router.replace('/counselor/dashboard')} /></CounselorScreen>;
}
