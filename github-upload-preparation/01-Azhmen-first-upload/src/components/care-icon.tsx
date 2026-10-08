import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';

const icons = {
  more: 'ellipsis-horizontal', check: 'checkmark', plus: 'add',
  mood: 'happy-outline', home: 'home-outline', book: 'book-outline', profile: 'person-outline',
  back: 'chevron-back', chat: 'chatbubble-outline', heart: 'heart-outline',
  clock: 'time-outline', calendar: 'calendar-outline', breath: 'cloud-outline',
  walk: 'walk-outline', leaf: 'leaf-outline', portal: 'school-outline',
  lock: 'lock-closed-outline', id: 'card-outline', eye: 'eye-outline',
  eyeOff: 'eye-off-outline', shield: 'shield-checkmark-outline',
  anonymous: 'glasses-outline', arrow: 'arrow-forward', down: 'chevron-down',
} as const satisfies Record<string, ComponentProps<typeof Ionicons>['name']>;

type FaceName = 'great' | 'good' | 'okay' | 'low' | 'veryLow';
type CareIconName = keyof typeof icons | FaceName;

// Native shapes keep all five mood expressions distinct without emoji or SVG decoding.
function FaceIndicator({ name, size, color }: { name: FaceName; size: number; color: string }) {
  const sad = name === 'low' || name === 'veryLow';
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: color }}>
    {[0.28, 0.64].map(left => <View key={left} style={{ position: 'absolute', left: size * left, top: size * 0.3, width: size * 0.08, height: size * 0.08, borderRadius: size, backgroundColor: color }} />)}
    <View style={{ position: 'absolute', left: size * 0.25, top: size * (sad ? 0.58 : 0.5), width: size * 0.45, height: name === 'okay' ? 0 : size * 0.23, borderColor: color, borderWidth: name === 'okay' ? 0 : 1.6, borderTopWidth: sad || name === 'great' ? 1.6 : 0, borderBottomWidth: sad ? 0 : 1.6, borderRadius: name === 'okay' ? 0 : size, backgroundColor: name === 'great' ? color : undefined }} />
    {name === 'veryLow' ? <View style={{ position: 'absolute', left: size * 0.73, top: size * 0.45, width: size * 0.07, height: size * 0.14, borderRadius: size, backgroundColor: color }} /> : null}
  </View>;
}

export function CareIcon({ name, size = 18, color = Colors.careGreen }: { name: CareIconName; size?: number; color?: string }) {
  if (!(name in icons)) return <FaceIndicator name={name as FaceName} size={size} color={color} />;
  return <Ionicons name={icons[name as keyof typeof icons]} size={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no" style={styles.icon} />;
}
const styles = StyleSheet.create({ icon: { flexShrink: 0 } });
