import { RoleLayout } from '@/components/role-layout';
import { AppointmentReminderProvider } from '@/components/appointment-reminder-provider';
export default function StudentLayout() { return <AppointmentReminderProvider><RoleLayout role="student" /></AppointmentReminderProvider>; }
