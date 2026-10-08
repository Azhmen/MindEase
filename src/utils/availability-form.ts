import { localDateString } from '@/constants/booking';
import type { AvailabilityInput } from '@/services/counselor-management';

const FIRST_MINUTE = 8 * 60;
const LAST_MINUTE = 18 * 60;
const INTERVAL_MINUTES = 30;

export const AVAILABILITY_TIMES = Array.from(
  { length: (LAST_MINUTE - FIRST_MINUTE) / INTERVAL_MINUTES + 1 },
  (_, index) => {
    const minutes = FIRST_MINUTE + index * INTERVAL_MINUTES;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  },
);

// Keep valid older slots selectable, even outside the standard half-hour range.
export function availabilityTimeOptions(current: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(current) && !AVAILABILITY_TIMES.includes(current)
    ? [...AVAILABILITY_TIMES, current].sort()
    : AVAILABILITY_TIMES;
}

export function validateAvailabilityForm(value: AvailabilityInput, today = localDateString(new Date())) {
  if (!value.date) throw new Error('Select a date.');
  if (value.date < today) throw new Error('Select today or a future date.');
  if (!value.startTime) throw new Error('Select a start time.');
  if (!value.endTime) throw new Error('Select an end time.');
  if (value.endTime <= value.startTime) throw new Error('End time must be after start time.');
}
