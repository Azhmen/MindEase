import { Stack } from 'expo-router';
import { BookingDraftProvider } from '@/components/booking-draft';
export default function AppointmentsLayout() {
  return <BookingDraftProvider><Stack screenOptions={{ headerShown: false }} /></BookingDraftProvider>;
}
