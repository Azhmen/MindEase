const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
let slots, index, effects, callbacks, route, cancelCalls, reminderCalls, rejectCancel, releaseReminder;
let noteReads = 0, noteWrites = 0;
const future = new Date(Date.now() + 48 * 3600000);
const entry = { id: 'active', studentId: 'student-a', counselorId: 'counselor-a', status: 'booked', appointmentDate: '2035-10-08', appointmentTime: '11:00', sessionFormat: 'Virtual' };
const appointments = {
  getAppointmentsForStudent: async () => [entry, { ...entry, id: 'cancelled', status: 'cancelled' }, { ...entry, id: 'completed', status: 'completed' }],
  getAppointment: async () => entry,
  appointmentStart: () => future,
  cancelAppointment: async () => { cancelCalls++; if (rejectCancel) throw new Error('Cancellation failed'); },
};
const hooks = { ...React,
  useState: initial => { const key = index++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], value => { slots[key] = typeof value === 'function' ? value(slots[key]) : value; }]; },
  useRef: initial => { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; },
  useCallback: (callback, deps) => { const key = index++; if (!slots[key] || deps.some((dep, i) => dep !== slots[key].deps[i])) slots[key] = { callback, deps }; return slots[key].callback; },
};
const widget = props => React.createElement('Widget', props, props.children);
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/appointment-screens.tsx', 'utf8') + '\nexport { NoteEditor };', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: exportsObject, require: id => {
    if (id === 'react') return hooks;
    if (id === 'react-native') return { View: 'View' };
    if (id === 'expo-router') return { useRouter: () => ({ push() {}, replace: next => { route = next; } }), useLocalSearchParams: () => ({ id: 'active' }), useFocusEffect: callback => { if (!callbacks.has(callback)) { callbacks.add(callback); effects.push(callback); } } };
    if (id === '@/services/appointments') return appointments;
    if (id === '@/services/student-session') return { requireUserId: () => 'student-a' };
    if (id === '@/services/pre-session-notes') return { getPreSessionNote: async () => { noteReads++; return null; }, createPreSessionNote: async () => { noteWrites++; }, updatePreSessionNote: async () => { noteWrites++; }, deletePreSessionNote: async () => { noteWrites++; } };
    if (id === '@/services/appointment-reminders') return { handleAppointmentReminderEvent: async (id, kind) => { assert.equal(id, 'active'); assert.equal(kind, 'cancelled'); reminderCalls++; await new Promise(resolve => { releaseReminder = resolve; }); } };
    if (id === '@/components/booking-draft') return { useBookingDraft: () => ({ reset() {} }) };
    if (id === '@/utils/auth') return { getAuthErrorMessage: error => error.message };
    if (id === '@/components/student-ui') return { StudentCard: widget, CareButton: widget, studentStyles: {} };
    if (id === '@/components/student-screen') return { StudentScreen: widget, StatusMessage: widget, LoadingState: widget };
    if (id === '@/components/appointment-ui') return { AppointmentSummary: widget, appointmentStyles: {} };
    if (id === '@/components/appointment-reminder-status') return { AppointmentReminderStatus: widget };
    if (id === '@/components/appointment-reminder-banner') return { AppointmentReminderBanner: widget };
    if (id === '@/components/text') return { AppText: widget };
    if (id === '@/components/app-text-input') return { AppTextInput: widget };
    if (id === '@/components/care-icon') return { CareIcon: widget };
    if (id.startsWith('@/')) return {};
    return require(id);
  },
});
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
const button = (tree, title) => { const node = nodes(tree).find(n => n.props?.title === title); assert.ok(node, title); return node; };
let screen;
const render = () => { index = 0; return screen(); };
async function mount(name) { slots = []; callbacks = new Set(); effects = []; cancelCalls = reminderCalls = 0; route = ''; rejectCancel = false; releaseReminder = undefined; screen = () => exportsObject[name]({ appointmentId: 'active' }); render(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate); return render(); }
async function test() {
  let tree = await mount('AppointmentsScreen');
  assert.ok(!nodes(tree).some(n => n.props?.id === 'cancelled'), 'Cancelled appointments excluded on load');
  assert.ok(nodes(tree).some(n => n.props?.id === 'completed'), 'Completed appointments retained');
  const cancel = button(tree, 'Cancel Appointment');
  const first = cancel.props.onPress(); const second = cancel.props.onPress();
  await new Promise(setImmediate);
  tree = render();
  assert.equal(cancelCalls, 1, 'Repeated presses locked synchronously');
  assert.equal(reminderCalls, 1);
  assert.ok(!nodes(tree).some(n => n.props?.id === 'active'), 'Removed after successful write before reminder cleanup finishes');
  assert.equal(button(tree, 'Book Appointment').props.disabled, true);
  releaseReminder(); await Promise.all([first, second]);
  assert.equal(button(render(), 'Book Appointment').props.disabled, false);
  tree = await mount('AppointmentsScreen'); rejectCancel = true;
  await button(tree, 'Cancel Appointment').props.onPress(); tree = render();
  assert.ok(nodes(tree).some(n => n.props?.id === 'active'), 'Failed cancellation retains entry');
  assert.ok(nodes(tree).some(n => n.props?.message === 'Cancellation failed'));
  assert.equal(reminderCalls, 0);
  tree = await mount('EditAppointmentScreen');
  const detail = button(tree, 'Cancel Appointment'); const pending = detail.props.onPress(); detail.props.onPress();
  await new Promise(setImmediate); tree = render();
  assert.equal(cancelCalls, 1); assert.ok(nodes(tree).some(n => n.props?.status === 'cancelled'));
  assert.ok(!nodes(tree).some(n => n.props?.title === 'Cancel Appointment'));
  releaseReminder(); await pending; assert.equal(route, '/student/appointments');
  tree = await mount('NoteEditor'); button(tree, 'Add Note').props.onPress(); tree = render();
  nodes(tree).find(n => n.props?.label === 'What would you like support with?').props.onChangeText('  First note  '); tree = render();
  const save = button(tree, 'Save Note'); await Promise.all([save.props.onPress(), save.props.onPress()]); tree = render();
  assert.equal(noteWrites, 1); assert.equal(noteReads, 1, 'Save must not depend on rereading');
  assert.ok(nodes(tree).some(n => n.props?.children === 'First note')); button(tree, 'Edit Note').props.onPress(); tree = render();
  assert.equal(nodes(tree).find(n => n.props?.label === 'What would you like support with?').props.value, 'First note');
  console.log('PASS: pre-session note immediately displays saved trimmed text, closes editor, preserves edit draft and prevents duplicate writes without a reread.');
  console.log('PASS: single-tap list/details cancellation, cancelled filtering with completed preserved, immediate local removal before cleanup, duplicate guard, disabled/loading state, failure retention, reminder cleanup and detail return.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
