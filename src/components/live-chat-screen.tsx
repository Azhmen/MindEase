import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { detectCrisisCue } from '@/utils/crisis-cues';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CareButton, StudentCard, StudentFrame } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { ChatHeader, ChatBubble, SuggestedReply } from '@/components/chat-ui';
import { StatusMessage } from '@/components/student-screen';
import { getCounselor, type ChatMessage } from '@/services/chat';
import * as studentChat from '@/services/chat';
import * as anonymousChat from '@/services/anonymous-chat';
import { getCurrentUser } from '@/services/auth';
import type { UserRole } from '@/services/user-profile';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';

export function LiveChatScreen({ role, threadId, anonymous = false }: { role: UserRole; threadId: string; anonymous?: boolean }) {
  const service = anonymous ? anonymousChat : studentChat;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState(role === 'student' ? 'Your counselor' : 'Student conversation');
  const [status, setStatus] = useState('Campus Care · Live conversation');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const savedDraft = useRef('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [readError, setReadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const list = useRef<FlatList<ChatMessage>>(null);
  const lock = useRef(false);
  const uid = getCurrentUser()?.uid;
  const router = useRouter();
  const [sentCrisisCue, setSentCrisisCue] = useState(false);
  const showCrisisSupport = role === 'student' && (sentCrisisCue || messages.some(message => message.senderId === uid && detectCrisisCue(message.text)));
  useEffect(() => {
    let active = true, failed = false, identityVersion = 0;
    const subscriptions: (() => void)[] = [];
    function fail(err: unknown) {
      if (!active || failed) return;
      failed = true; setMessages([]); setLoading(false); setReadError(getAuthErrorMessage(err));
      subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
    }
    async function connect() {
      try {
        await service.getChatThread(threadId);
        if (!active) return;
        subscriptions.push(service.subscribeToThread(threadId, async thread => {
          const version = ++identityVersion;
          if (!active || failed) return;
          if (role === 'counselor') { if (anonymous) setName('Anonymous Student'); setStatus(anonymous ? 'Anonymous conversation · Campus Care' : 'Student ID: ' + thread.studentId); return; }
          try {
            const counselor = await getCounselor(thread.counselorId);
            if (active && !failed && version === identityVersion) {
              setName(counselor?.name ?? 'Your counselor');
              setStatus(counselor ? (counselor.active ? 'Active counselor' : 'Existing conversation') + ' · ' + (counselor.title || 'Campus Care') : 'Contact campus support for counselor availability');
            }
          } catch (err) { fail(err); }
        }, fail));
        subscriptions.push(service.subscribeToMessages(threadId, data => { if (active && !failed) { setMessages(data); setLoading(false); } }, fail));
      } catch (err) { fail(err); }
    }
    void connect();
    return () => { active = false; subscriptions.forEach(unsubscribe => unsubscribe()); };
  }, [threadId, role, attempt, anonymous, service]);
  async function send() {
    if (lock.current || loading || readError || !text.trim()) return;
    if (role === 'student' && detectCrisisCue(text)) setSentCrisisCue(true);
    lock.current = true; setSending(true); setSendError('');
    try {
      if (editing) { await service.updateOwnMessage(threadId, editing.id, text); setMessages(current => current.map(message => message.id === editing.id ? { ...message, text: text.trim(), edited: true } : message)); setEditing(null); setText(savedDraft.current); }
      else { await service.sendMessage(threadId, text); setText(''); }
    }
    catch (err) { setSendError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setSending(false); }
  }
  function beginEdit(message: ChatMessage) {
    if (lock.current || message.senderId !== uid) return;
    if (!editing) savedDraft.current = text;
    setEditing(message); setText(message.text); setSendError('');
  }
  function cancelEdit() { setEditing(null); setText(savedDraft.current); setSendError(''); }
  async function remove() {
    if (lock.current || !deleteTarget) return;
    lock.current = true; setSending(true); setSendError('');
    try { await service.deleteOwnMessage(threadId, deleteTarget.id); setMessages(current => current.filter(message => message.id !== deleteTarget.id)); if (editing?.id === deleteTarget.id) cancelEdit(); }
    catch (err) { setSendError(getAuthErrorMessage(err)); }
    finally { setDeleteTarget(null); lock.current = false; setSending(false); }
  }
  return <StudentFrame anonymous={anonymous} showNavigation={role === 'student'}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ChatHeader name={name} status={status} backTo={role === 'student' ? (anonymous ? '/anonymous/home' : '/student/home') : '/counselor/chats'} />
    <AppText style={styles.notice}>Messages go to a real person. Replies may take time. Chat does not replace professional care or emergency support.</AppText>
    {showCrisisSupport ? <StudentCard style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.careAlert, borderColor: Colors.careAlertBorder }}><AppText style={{ color: Colors.error, fontSize: 14, fontWeight: '600' }}>Your safety comes first</AppText><AppText style={{ fontSize: 13, lineHeight: 19 }}>If you are in immediate danger, contact trusted local, campus or emergency support now. Your counselor conversation remains available.</AppText><CareButton title="Open Crisis Support" danger secondary onPress={() => router.push(anonymous ? '/anonymous/crisis-support' : '/student/crisis-support')} /></StudentCard> : null}
    <FlatList ref={list} style={styles.flex} data={messages} keyExtractor={message => message.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      ListHeaderComponent={<View style={{ gap: 12 }}>{loading ? <ActivityIndicator color={Colors.careGreen} /> : null}<StatusMessage message={readError} error />{readError ? <CareButton title="Reconnect" onPress={() => { setLoading(true); setReadError(''); setMessages([]); setAttempt(value => value + 1); }} /> : null}</View>}
      ListEmptyComponent={!loading && !readError ? <StudentCard style={{ alignItems: 'center', marginVertical: 16 }}><CareIcon name="chat" size={32} /><AppText style={styles.empty}>No messages yet. Start your conversation below.</AppText></StudentCard> : null}
      renderItem={({ item }) => <ChatBubble message={item} own={item.senderId === uid} disabled={sending || !!readError} onEdit={() => beginEdit(item)} onDelete={() => { if (!lock.current && item.senderId === uid) setDeleteTarget(item); }} />} />
    <View style={styles.composer}>
      {editing ? <View style={styles.inputRow}><AppText style={styles.empty}>Editing message</AppText><CareButton title="Cancel" secondary disabled={sending} onPress={cancelEdit} /></View> : null}
      {role === 'student' && !editing ? <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>{['Tell me about exam stress', "Let's do the breathing reset", 'I just need to vent'].map(suggestion => <SuggestedReply key={suggestion} title={suggestion} disabled={sending} onPress={() => setText(suggestion)} />)}</ScrollView> : null}
      <View style={styles.inputRow}><View style={styles.flex}><AppTextInput label={editing ? "Edit message" : "Message"} placeholder="Write a message..." multiline maxLength={2000} value={text} onChangeText={setText} editable={!sending && !loading && !readError} style={styles.input} /></View><CareButton title={sending ? '...' : editing ? 'Save' : 'Send'} disabled={sending || loading || !!readError || !text.trim()} onPress={send} /></View>
      <StatusMessage message={sendError} error />
    </View>
    <Modal transparent visible={!!deleteTarget} animationType="fade" onRequestClose={() => { if (!sending) setDeleteTarget(null); }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.overlay }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 320, padding: 20, gap: 20, backgroundColor: Colors.surface, borderRadius: 18 }}>
          <AppText>Delete this message?</AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 24 }}>
            <Pressable accessibilityRole="button" disabled={sending} onPress={() => setDeleteTarget(null)} style={{ paddingVertical: 8 }}><AppText>Cancel</AppText></Pressable>
            <Pressable accessibilityRole="button" disabled={sending} onPress={remove} style={{ paddingVertical: 8 }}><AppText style={{ color: Colors.error }}>{sending ? 'Deleting...' : 'Delete'}</AppText></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </KeyboardAvoidingView></StudentFrame>;
}
const styles = StyleSheet.create({ flex: { flex: 1, minHeight: 0, minWidth: 0 }, notice: { color: Colors.careMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.carePale }, list: { gap: 12, padding: 16, flexGrow: 1 }, empty: { color: Colors.careMuted, fontSize: 14 }, composer: { backgroundColor: Colors.surface, gap: 8, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -4px 20px ' + Colors.careShadow }, inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { minHeight: 48, maxHeight: 100, paddingTop: 12, textAlignVertical: 'top', backgroundColor: Colors.careInput, borderColor: Colors.careBorder, fontSize: 15 } });
