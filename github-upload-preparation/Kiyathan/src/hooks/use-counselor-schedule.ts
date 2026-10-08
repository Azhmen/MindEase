import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getCounselorSessions, getOwnAvailability, type AvailabilitySlot } from '@/services/counselor-management';
import type { Appointment } from '@/services/appointments';
import { getAuthErrorMessage } from '@/utils/auth';
export function useCounselorSchedule() {
  const [sessions, setSessions] = useState<Appointment[]>([]), [slots, setSlots] = useState<AvailabilitySlot[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt; let active = true; setLoading(true); setError(''); setSessions([]); setSlots([]);
    Promise.all([getCounselorSessions(), getOwnAvailability()]).then(([a, b]) => { if (active) { setSessions(a); setSlots(b); } }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  return { sessions, slots, loading, error, retry: () => setAttempt(v => v + 1) };
}
