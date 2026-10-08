import type { Mood, MoodEntry } from '@/services/mood';

export type MoodRange = 'This Week' | 'Month' | 'All Time';
export const MOOD_RANGES: MoodRange[] = ['This Week', 'Month', 'All Time'];
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function moodRhythm(entries: MoodEntry[], range: MoodRange, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const end = new Date(monday); end.setDate(end.getDate() + 7);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const sorted = [...entries].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  const daily = new Map<string, MoodEntry>();
  for (const entry of sorted) {
    const date = entry.createdAt?.toDate();
    if (date && Number.isFinite(date.getTime()) && date <= now && !daily.has(dayKey(date))) daily.set(dayKey(date), entry);
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index);
    return { date, entry: daily.get(dayKey(date)), today: dayKey(date) === dayKey(today) };
  });
  const recent = sorted.filter(entry => {
    if (range === 'All Time') return true;
    const date = entry.createdAt?.toDate();
    return date && date <= now && (range === 'This Week' ? date >= monday && date < end : date >= month && date < nextMonth);
  });
  const counts = new Map<Mood, number>();
  const recentIds = new Set(recent.map(entry => entry.id));
  for (const entry of daily.values()) {
    if (!recentIds.has(entry.id)) continue;
    counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
  }
  // Ties favor the most recently recorded mood in the selected range.
  const frequent = [...counts].sort((a, b) => b[1] - a[1])[0];
  let streak = 0;
  const cursor = new Date(today);
  if (!daily.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daily.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const count = week.filter(day => day.entry).length;
  return { week, count, recent, frequent, streak, weekEntries: sorted.filter(entry => { const date = entry.createdAt?.toDate(); return date && date >= monday && date < end && date <= now; }).length, status: count >= 5 ? 'In sync' : count >= 2 ? 'Building rhythm' : 'Keep checking in' };
}
