export const SUPPORT_TOPICS = ['Exam Stress & Overwhelm', 'Sleep Difficulties', 'Procrastination / Focus', 'Social Anxiety', 'Feeling Down', 'Life Transitions'] as const;
export function localDateString(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function suggestedBookingDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() + index + 1);
    return { value: localDateString(date), label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) };
  });
}
export function bookingDateLabel(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
