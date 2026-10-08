import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { SessionFormat } from '@/services/appointments';
export interface BookingDraft {
  id: string; ownerUid: string; counselorId: string; counselorName: string;
  appointmentDate: string; appointmentTime: string; sessionFormat: SessionFormat;
  topics: string[]; note: string;
}
const emptyDraft: BookingDraft = { id: '', ownerUid: '', counselorId: '', counselorName: '', appointmentDate: '', appointmentTime: '', sessionFormat: 'Virtual', topics: [], note: '' };
const DraftContext = createContext<{ draft: BookingDraft; setDraft: (value: BookingDraft) => void; reset: () => void } | null>(null);
export function BookingDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState(emptyDraft);
  return <DraftContext.Provider value={{ draft, setDraft, reset: () => setDraft({ ...emptyDraft, topics: [] }) }}>{children}</DraftContext.Provider>;
}
export function useBookingDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error('Booking screens require BookingDraftProvider.');
  return context;
}
// Drafts are memory-only. No personal notes are placed in URLs or local storage.
