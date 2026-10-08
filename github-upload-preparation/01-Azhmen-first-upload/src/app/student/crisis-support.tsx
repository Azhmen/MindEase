import { useRouter } from 'expo-router';
import { StudentScreen } from '@/components/student-screen';
import { CareButton } from '@/components/student-ui';
import { CrisisSupportContent } from '@/components/crisis-support-content';

export default function CrisisSupportRoute({ anonymous = false }: { anonymous?: boolean }) {
  const router = useRouter();
  return <StudentScreen anonymous={anonymous} title="Immediate Support">
    <CrisisSupportContent />
    <CareButton title="Back to Home" onPress={() => router.replace(anonymous ? '/anonymous/home' : '/student/home')} />
  </StudentScreen>;
}
