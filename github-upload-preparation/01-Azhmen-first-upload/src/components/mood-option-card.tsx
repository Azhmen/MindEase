import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import type { Mood } from '@/services/mood';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

const moodSurfaces = { Great: Colors.careAmber, Good: Colors.carePale, Okay: Colors.careBadge, Low: Colors.careLavender, 'Very Low': Colors.careInput };
const icons = { Great: 'great', Good: 'good', Okay: 'okay', Low: 'low', 'Very Low': 'veryLow' } as const;
export function MoodFace({ mood, size = 34 }: { mood: Mood; size?: number }) { return <CareIcon name={icons[mood]} size={size} />; }
export function MoodOptionCard({ mood, selected, disabled, onPress, richColors = false }: { mood: Mood; selected: boolean; disabled: boolean; onPress: () => void; richColors?: boolean }) {
  const mintSurfaces = { Great: '#D1EBDD', Good: '#DFF1E7', Okay: '#E5EEE1', Low: '#E8EDE3', 'Very Low': '#EEEDE2' };
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} accessibilityLabel={mood} disabled={disabled} onPress={onPress} style={[styles.card, richColors && { backgroundColor: '#D5EADF' }, selected && styles.selected, richColors && selected && { boxShadow: '0 0 0 2px #77A58D' }]}><View style={[styles.face, { backgroundColor: richColors ? mintSurfaces[mood] : moodSurfaces[mood] }, selected && styles.selectedFace, richColors && selected && { backgroundColor: '#D1EBDD' }]}><MoodFace mood={mood} /></View><AppText variant="caption" style={[styles.label, selected && styles.selectedLabel]}>{mood}</AppText><View style={[styles.dot, selected && styles.dotSelected]} /></Pressable>;
}
const styles = StyleSheet.create({ card: { flex: 1, minHeight: 104, paddingVertical: 12, gap: 6, alignItems: 'center', borderWidth: 0, borderColor: Colors.careBorder, borderRadius: 18, backgroundColor: Colors.careInput }, selected: { backgroundColor: Colors.careGreen, boxShadow: '0 6px 16px ' + Colors.careShadow, transform: [{ translateY: -2 }] }, face: { width: 36, height: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, selectedFace: { backgroundColor: Colors.surface }, label: { fontSize: 11, fontWeight: '600', color: Colors.careGreen }, dot: { width: 9, height: 9, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.careAccent }, selectedLabel: { color: Colors.onPrimary }, dotSelected: { backgroundColor: Colors.onPrimary, borderColor: Colors.onPrimary } });
