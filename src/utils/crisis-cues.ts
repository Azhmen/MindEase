// A conservative signpost, not a risk assessment or counseling response.
export function detectCrisisCue(text: string): boolean {
  const message = text.toLowerCase().replace(/[’]/g, "'");
  const cues = /\b(kill myself|end my life|take my own life|want to die|going to hurt myself|hurt myself right now|can't stay safe|cannot stay safe|in immediate danger|overdosed|took an overdose|i am suicidal|i'm suicidal|i have a suicide plan)\b/g;
  return [...message.matchAll(cues)].some(match => !/\b(not|never|don't|do not|won't|will not)\s*$/.test(message.slice(Math.max(0, match.index - 24), match.index)));
}
