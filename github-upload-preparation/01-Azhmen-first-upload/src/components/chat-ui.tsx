import { useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { formatEntryDate } from '@/components/student-screen';
import type { ChatMessage } from '@/services/chat';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

export function ChatHeader({ name, status, backTo }: { name: string; status: string; backTo: Href }) {
  const router = useRouter();
  return <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.back} onPress={() => router.replace(backTo)}><CareIcon name="back" size={22} /></Pressable><View style={styles.avatar}><CareIcon name="profile" size={24} /></View><View style={styles.flex}><AppText style={styles.title}>{name}</AppText><AppText style={styles.available}>{status}</AppText></View></View>;
}
export function ChatBubble({ message, own, disabled, onEdit, onDelete }: { message: ChatMessage; own: boolean; disabled?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const anchor = useRef<View>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const { width, height } = useWindowDimensions();
  function openMenu() {
    anchor.current?.measureInWindow((x, y, w, h) => {
      setPosition({ left: Math.max(8, Math.min(x + w - 144, width - 152)), top: Math.max(8, y + h + 100 < height ? y + h + 4 : y - 100) });
    });
  }
  return <View style={[styles.bubble, own && styles.user]}>
    <AppText style={[styles.text, own && styles.ownText]}>{message.text}</AppText>
    <View style={styles.messageMetaRow}>
      <AppText style={[styles.timestamp, own && styles.ownTimestamp]}>{formatEntryDate(message.createdAt)}{message.edited ? ' · edited' : ''}</AppText>
      {own && onEdit && onDelete ? <View ref={anchor} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Message actions" disabled={disabled} onPress={openMenu} hitSlop={8} style={styles.messageMenuButton}><CareIcon name="more" size={18} color={own ? Colors.carePale : Colors.careMuted} /></Pressable></View> : null}
    </View>
    <Modal transparent visible={!!position && own && !disabled} animationType="fade" onRequestClose={() => setPosition(null)}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close message menu" style={StyleSheet.absoluteFill} onPress={() => setPosition(null)} />
        <View accessibilityViewIsModal style={{ position: 'absolute', top: position?.top ?? 0, left: position?.left ?? 0, width: 144, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.careBorder, shadowColor: Colors.careGreen, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5, paddingVertical: 4 }}>
          <Pressable accessibilityRole="button" onPress={() => { setPosition(null); onEdit?.(); }} style={{ paddingHorizontal: 14, paddingVertical: 10 }}><AppText style={styles.text}>Edit</AppText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setPosition(null); onDelete?.(); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}><AppText style={[styles.text, { color: Colors.error }]}>Delete</AppText></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
export function SuggestedReply({ title, disabled, onPress }: { title: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={styles.suggestion}><AppText style={styles.suggestionText}>{title}</AppText></Pressable>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.surface }, back: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 44, height: 44, borderRadius: BorderRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.carePale }, flex: { flex: 1, minWidth: 0 }, title: { color: Colors.careGreen, fontSize: 15, lineHeight: 22, fontWeight: '700' }, available: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 }, bubble: { alignSelf: 'flex-start', maxWidth: '82%', backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderBottomLeftRadius: 4, borderWidth: 0, boxShadow: '0 2px 8px ' + Colors.careShadow, paddingHorizontal: 16, paddingVertical: 12 }, messageMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 }, messageMenuButton: { paddingHorizontal: 4, paddingVertical: 2 }, user: { alignSelf: 'flex-end', backgroundColor: Colors.careGreen, borderBottomLeftRadius: BorderRadius.large, borderBottomRightRadius: 4 }, ownText: { color: Colors.onPrimary }, ownTimestamp: { color: Colors.carePale }, text: { fontSize: 15, lineHeight: 22, color: Colors.careGreen }, timestamp: { flexShrink: 1, fontSize: 11, lineHeight: 16, color: Colors.careMuted, textAlign: 'right' }, suggestion: { borderWidth: 0, borderColor: Colors.careBorder, borderRadius: BorderRadius.round, paddingHorizontal: 14, justifyContent: 'center', minHeight: 38, backgroundColor: Colors.careInput }, suggestionText: { fontSize: 13, color: Colors.careGreen } });

