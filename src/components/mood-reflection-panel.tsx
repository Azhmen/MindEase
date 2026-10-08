import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { CareButton, studentStyles } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { StatusMessage } from '@/components/student-screen';
import { useGihaniAction } from '@/components/gihani-ui';
import { createMoodReflection, deleteMoodReflection, updateMoodReflection, type MoodReflection } from '@/services/mood-reflections';
import { Colors } from '@/constants/colors';

export function MoodReflectionPanel({ moodEntryId, reflection, disabled, onChanged }: { moodEntryId: string; reflection?: MoodReflection; disabled: boolean; onChanged: (text: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const action = useGihaniAction();
  function close() { if (!action.busy) { setOpen(false); setConfirmDelete(false); } }
  return <View>
    <View style={styles.preview}>
      {reflection ? <>
        <AppText style={styles.label}>Reflection</AppText>
        <AppText style={styles.text}>{reflection.reflection}</AppText>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit reflection" accessibilityState={{ disabled: disabled || action.busy }} disabled={disabled || action.busy} onPress={() => { setText(reflection.reflection); setConfirmDelete(false); setOpen(true); }} style={styles.inlineAction}><AppText style={styles.add}>Edit</AppText></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete reflection" accessibilityState={{ disabled: disabled || action.busy }} disabled={disabled || action.busy} onPress={() => { setConfirmDelete(true); setOpen(true); }} style={styles.inlineAction}><AppText style={[styles.add, styles.danger]}>Delete</AppText></Pressable>
        </View>
      </> : <View style={styles.empty}>
        <AppText style={styles.text}>{disabled ? 'Reflections unavailable' : 'No reflection yet'}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Add reflection" accessibilityState={{ disabled: disabled || action.busy }} disabled={disabled || action.busy} onPress={() => { setText(''); setConfirmDelete(false); setOpen(true); }} style={styles.inlineAction}><AppText style={styles.add}>+ Add reflection</AppText></Pressable>
      </View>}
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View accessibilityViewIsModal style={styles.dialog}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.row}><AppText style={[studentStyles.section, { flex: 1 }]}>{reflection ? 'Your reflection' : 'Add reflection'}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Close reflection" disabled={action.busy} onPress={close} style={styles.close}><CareIcon name="back" size={22} /></Pressable></View>
        <StatusMessage message={action.error} error />
        {confirmDelete ? <><AppText accessibilityRole="alert">Delete this reflection?</AppText><AppText style={styles.text}>Your original mood check-in will remain.</AppText><CareButton danger title={action.busy ? 'Deleting…' : 'Confirm Delete Reflection'} disabled={action.busy || disabled} onPress={() => action.run(async () => { await deleteMoodReflection(moodEntryId); setOpen(false); setConfirmDelete(false); onChanged(null); }, 'Reflection deleted. Your check-in is unchanged.')} /><CareButton title="Keep Reflection" secondary disabled={action.busy} onPress={() => setConfirmDelete(false)} /></> : <>
          <AppText style={styles.text}>Looking back, how do you feel about this check-in?</AppText>
          <AppTextInput label="Reflection" multiline maxLength={1000} editable={!action.busy && !disabled} value={text} onChangeText={setText} style={styles.editor} placeholder="Write a few words for your future self…" />
          <AppText style={styles.text}>{text.length}/1000 characters</AppText>
          <CareButton title={action.busy ? 'Saving…' : 'Save Reflection'} disabled={action.busy || disabled || !text.trim()} onPress={() => action.run(async () => { if (reflection) await updateMoodReflection(moodEntryId, text); else await createMoodReflection(moodEntryId, text); setOpen(false); onChanged(text.trim()); }, 'Reflection saved.')} />
          <CareButton title="Cancel" secondary disabled={action.busy} onPress={close} />
        </>}
      </ScrollView></View></KeyboardAvoidingView>
    </Modal>
    <StatusMessage message={action.notice} />
  </View>;
}
const styles = StyleSheet.create({ preview: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.careBorder, gap: 4 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 16 }, empty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12 }, inlineAction: { minHeight: 38, paddingHorizontal: 2, justifyContent: 'center' }, danger: { color: Colors.error }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, label: { color: Colors.careGreen, fontSize: 11, fontWeight: '600' }, text: { color: Colors.careMuted, fontSize: 12, lineHeight: 20 }, add: { color: Colors.careGreen, fontSize: 12, fontWeight: '600' }, overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }, dialog: { backgroundColor: Colors.surface, borderRadius: 28, maxWidth: 390, width: '100%', maxHeight: '85%' }, content: { padding: 24, gap: 16 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, editor: { minHeight: 140, textAlignVertical: 'top' } });
