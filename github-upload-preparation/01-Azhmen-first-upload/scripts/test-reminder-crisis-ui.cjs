// Actual UI handlers with mocked Firebase/notification boundaries; no app auth bypass.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
let state = [], index = 0, route = '', sent = [], updated = [], guest = false, stored = false, deny = false;
const { detectCrisisCue } = (() => { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/crisis-cues.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports }); return exports; })();
const widget = props => React.createElement('Widget', props, props.children);
const hooks = { ...React, useState: initial => { const key = index++; if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial; return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }]; }, useRef: value => ({ current: value }), useEffect: () => {} };
function load(name) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components', name + '.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, console: { error() {} }, require: id => {
    if (id === 'react') return hooks;
    if (id === 'react-native') return { Platform: { OS: 'web' }, Switch: 'Switch', View: 'View', Pressable: 'Pressable', Modal: 'Modal', FlatList: 'FlatList', ScrollView: 'ScrollView', KeyboardAvoidingView: 'Keyboard', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } };
    if (id === 'expo-router') return { useRouter: () => ({ push: value => { route = value; } }) };
    if (id === '@/utils/crisis-cues') return { detectCrisisCue };
    if (id === '@/services/auth') return { getCurrentUser: () => ({ uid: guest ? 'guest' : 'student-a' }) };
    if (id === '@/services/chat' || id === '@/services/anonymous-chat') return { sendMessage: async (thread, text) => sent.push({ thread, text, guest }), updateOwnMessage: async (thread, id, text) => updated.push({ thread, id, text }), getCounselor: async () => null };
    if (id === '@/services/user-profile') return { setAppointmentRemindersEnabled: async (value, uid) => { if (deny) throw new Error('permission-denied'); assert.equal(uid, 'student-a'); stored = value; } };
    if (id === '@/services/reminder-notifications') return { requestReminderPermission: async () => true };
    if (id === '@/utils/auth') return { getAuthErrorMessage: error => error.message };
    if (id === '@/constants/colors') return { Colors: {} };
    if (id === '@/components/student-ui') return { CareButton: widget, StudentCard: widget, StudentFrame: widget, studentStyles: {} };
    if (id === '@/components/student-screen') return { StatusMessage: widget };
    if (id === '@/components/chat-ui') return { ChatHeader: widget, ChatBubble: widget, SuggestedReply: widget };
    if (id === '@/components/app-text-input') return { AppTextInput: widget };
    if (id === '@/components/text') return { AppText: widget };
    if (id === '@/components/care-icon') return { CareIcon: widget };
    if (id === '@/components/appointment-reminder-banner') return { AppointmentReminderBanner: widget };
    return require(id);
  } });
  return exports;
}
function nodes(value) { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : []; }
function render(component, props) { index = 0; return component(props); }
function find(tree, predicate) { const found = nodes(tree).find(predicate); assert.ok(found); return found; }
async function test() {
  const Chat = load('live-chat-screen').LiveChatScreen;
  for (const anonymous of [false, true]) {
    guest = anonymous; state = []; const props = { role: 'student', threadId: 'thread', anonymous };
    render(Chat, props); state[6] = false; // Existing loading state is false after the listener resolves.
    let tree = render(Chat, props);
    find(tree, n => n.props?.label === 'Message').props.onChangeText('I have exam stress');
    tree = render(Chat, props); await find(tree, n => n.props?.title === 'Send').props.onPress();
    tree = render(Chat, props); assert.ok(!nodes(tree).some(n => n.props?.title === 'Open Crisis Support'));
    find(tree, n => n.props?.label === 'Message').props.onChangeText('I cannot stay safe');
    tree = render(Chat, props); await find(tree, n => n.props?.title === 'Send').props.onPress();
    tree = render(Chat, props); assert.equal(sent.at(-1).text, 'I cannot stay safe', 'Urgent text is still sent to the real counselor');
    find(tree, n => n.props?.title === 'Open Crisis Support').props.onPress();
    assert.equal(route, anonymous ? '/anonymous/crisis-support' : '/student/crisis-support');
    assert.ok(nodes(tree).some(n => typeof n.props?.children === 'string' && n.props.children.includes('does not replace professional care')));
    assert.ok(nodes(tree).some(n => n.props?.title === 'Send'), 'Conversation remains available');
  }
  guest = false; state = []; render(Chat, { role: 'counselor', threadId: 'thread' }); state[6] = false;
  assert.ok(!nodes(render(Chat, { role: 'counselor', threadId: 'thread' })).some(n => n.props?.title === 'Open Crisis Support'));
  const Settings = load('notification-preferences').NotificationPreferences;
  state = []; const profile = { uid: 'student-a', appointmentRemindersEnabled: false };
  let tree = render(Settings, { profile });
  await find(tree, n => n.type === 'Switch').props.onValueChange(true);
  tree = render(Settings, { profile }); assert.equal(find(tree, n => n.type === 'Switch').props.value, true); assert.equal(stored, true);
  state = []; tree = render(Settings, { profile: { ...profile, appointmentRemindersEnabled: stored } });
  assert.equal(find(tree, n => n.type === 'Switch').props.value, true, 'Reload uses persisted preference');
  deny = true; await find(tree, n => n.type === 'Switch').props.onValueChange(false);
  tree = render(Settings, { profile }); assert.equal(find(tree, n => n.type === 'Switch').props.value, true, 'Failed save preserves old setting');
  assert.ok(nodes(tree).some(n => n.props?.message === 'permission-denied'));
  console.log('PASS: actual normal/crisis send handlers preserve real messages/composer, correct authenticated/anonymous crisis routes, care disclaimer, preference toggle/reload/error UI.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
