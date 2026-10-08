// Actual TypeScript services, isolated in-memory Firestore boundary. Not deployed-rule tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
const rows = new Map(), cache = {};
let ids = 0, clock = 0, failCommit = false;
const loggedErrors = [];
function ref(key) { return { key, id: key.split('/').at(-1) }; }
function snapshot(reference) { return { exists: () => rows.has(reference.key), data: () => rows.get(reference.key), id: reference.id }; }
const api = {
  collection: (base, ...parts) => ref([base.key ?? '', ...parts].filter(Boolean).join('/')),
  doc: (base, ...parts) => ref([base.key ?? '', ...(parts.length ? parts : [String(++ids)])].filter(Boolean).join('/')),
  getDoc: async reference => snapshot(reference),
  where: (field, _, value) => ({ field, value }),
  query: (reference, filter) => ({ reference, filter }),
  getDocs: async input => {
    const reference = input.reference ?? input;
    return { docs: [...rows].filter(([key, data]) => key.startsWith(reference.key + '/') && !key.slice(reference.key.length + 1).includes('/') && (!input.filter || data[input.filter.field] === input.filter.value)).map(([key]) => snapshot(ref(key))) };
  },
  writeBatch: () => { const pending = []; return { delete: reference => pending.push(reference.key), commit: async () => { if (failCommit) { failCommit = false; throw Object.assign(new Error('Simulated network failure'), { code: 'unavailable' }); } pending.forEach(key => rows.delete(key)); } }; },
  serverTimestamp: () => { const value = ++clock; return { toMillis: () => value }; },
  runTransaction: async (_, callback) => {
    const pending = [];
    await callback({
      get: async reference => snapshot(reference),
      set: (reference, data) => pending.push([reference.key, data]),
      update: (reference, data) => pending.push([reference.key, { ...rows.get(reference.key), ...data }]),
      delete: reference => pending.push([reference.key, null]),
    });
    if (failCommit) { failCommit = false; throw Object.assign(new Error('Simulated network failure'), { code: 'unavailable' }); }
    pending.forEach(([key, data]) => data === null ? rows.delete(key) : rows.set(key, data));
  },
};
function load(name) {
  if (cache[name]) return cache[name];
  if (name === 'react-native') return { Platform: { OS: 'web', select: options => options.web ?? options.default } };
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name + '.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Error, __DEV__: true, console: { error: (...args) => loggedErrors.push(args) }, require: id => id === 'firebase/firestore' ? api : id === 'firebase/app' ? require('firebase/app') : id === '@/config/firebase' ? { db: {}, auth } : id === '@/services/auth' ? { getCurrentUser: () => auth.currentUser } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
// Exercise actual resource screens and services; only native widgets/router/Firebase are mocked.
const React = require('react');
let frame, frames = new Map(), focus = new Map(), effects = [], uiCache = {}, resourceId = 'published', tree, navigation = [], platform = 'web';
function slot(initial) { const index = frame.index++; if (!frame.values[index]) frame.values[index] = initial(); return frame.values[index]; }
const react = {
  ...React,
  useState: initial => { const state = slot(() => ({ value: typeof initial === 'function' ? initial() : initial })); return [state.value, value => { state.value = typeof value === 'function' ? value(state.value) : value; }]; },
  useRef: initial => slot(() => ({ current: initial })),
  useCallback: (callback, deps) => { const state = slot(() => ({ callback, deps })); if (deps.some((dep, index) => dep !== state.deps[index])) { state.callback = callback; state.deps = deps; } return state.callback; },
};
const widget = type => props => React.createElement(type, props, props.children);
const button = props => React.createElement('Button', props, props.title);
function uiLoad(name) {
  if (uiCache[name]) return uiCache[name];
  const file = path.join(__dirname, '..', 'src', name + (name === 'components/resource-screens' ? '.tsx' : '.tsx'));
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, Error, require: id => {
    if (id === 'react') return react;
    if (id === 'react-native') return { Platform: { get OS() { return platform; } }, Modal: props => props.visible ? React.createElement('Modal', props, props.children) : null, ScrollView: 'ScrollView', ActivityIndicator: 'Spinner', Pressable: 'Pressable', View: 'View', StyleSheet: { create: value => value } };
    if (id === 'expo-router') return { useRouter: () => ({ push() {}, replace: route => navigation.push(route) }), useLocalSearchParams: () => ({ id: resourceId }), useFocusEffect: callback => { if (focus.get(frame.key) !== callback) { focus.set(frame.key, callback); effects.push(callback); } } };
    if (id === '@/components/presentation') return { BotanicalArt: widget('Art'), FormPanel: widget('Form'), StepRail: widget('Progress'), presentation: {} };
    if (id === '@/components/wellness-ui') return {
      WellnessHeroCard: widget('Hero'), FeatureBanner: widget('Banner'), QuickActionTile: props => React.createElement('Button', props, props.title), StatTile: widget('Stat'), SectionHeader: widget('Section'), StatusChip: widget('Chip'), IllustratedEmptyState: props => React.createElement('Empty', props, [props.title, props.description, props.children]), SettingsRow: button, wellnessLayout: {},
    };
    if (id === '@/components/text') return { AppText: widget('Text') };
    if (id === '@/components/availability-date-picker') return uiLoad('components/availability-date-picker');
    if (id === '@/components/availability-time-picker') return uiLoad('components/availability-time-picker');
    if (id === '@expo/ui/community/datetime-picker') return { DateTimePicker: widget('NativeDatePicker') };
    if (id.startsWith('./')) return uiLoad(path.posix.join(path.posix.dirname(name), id));
    if (id === '@/components/app-text-input') return { AppTextInput: widget('Input') };
    if (id === '@/components/care-icon') return { CareIcon: widget('Icon') };
    if (id === '@/components/student-ui') return { CareButton: button, StudentCard: widget('Card'), studentStyles: {} };
    if (id === '@/components/student-screen') return { StudentScreen: widget('Screen'), StatusMessage: ({ message }) => React.createElement('Text', {}, message) };
    if (id === '@/components/counselor-ui') return { CounselorScreen: widget('Screen') };
    if (id === '@/components/appointment-ui') return { Choice: widget('Choice'), AppointmentSummary: widget('Summary'), appointmentStyles: {} };
    if (id.startsWith('@/')) return load(id.slice(2));
    return require(id);
  } });
  return uiCache[name] = exports;
}
function expand(node, key = 'root') {
  if (Array.isArray(node)) return node.map((child, index) => expand(child, key + '/' + (child?.key ?? index)));
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') {
    const parent = frame, identity = key + ':' + node.type.name;
    if (!frames.has(identity)) frames.set(identity, []);
    frame = { key: identity, values: frames.get(identity), index: 0 };
    const value = node.type(node.props); frame = parent;
    return expand(value, key);
  }
  return { ...node, props: { ...node.props, children: expand(node.props?.children, key + '/children') } };
}
let screen;
async function render() {
  tree = expand(React.createElement(screen));
  const pending = effects; effects = [];
  pending.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  tree = expand(React.createElement(screen));
}
async function mount(name, id = 'published') { resourceId = id; frames = new Map(); focus = new Map(); effects = []; screen = uiLoad('components/counselor-management-screens')[name]; await render(); }
function nodes(node) { if (Array.isArray(node)) return node.flatMap(child => nodes(child)); if (!node || typeof node !== 'object') return []; return [node, ...nodes(node.props?.children)]; }
function text(node) { if (Array.isArray(node)) return node.map(text).join(' '); return typeof node === 'object' && node ? text(node.props?.children) : String(node ?? ''); }
function findButton(title) { const result = nodes(tree).find(node => node.type === 'Button' && node.props.title === title); assert.ok(result, 'Expected button ' + title + '; actual screen: ' + text(tree)); return result; }
async function press(title) { const node = findButton(title); assert.ok(!node.props.disabled, title + ' is enabled'); await node.props.onPress(); await render(); }
async function test() {
  const service = load('services/counselor-management');
  rows.set('users/counselor-a', { role: 'counselor' });
  rows.set('users/counselor-b', { role: 'counselor' });
  auth.currentUser = { uid: 'counselor-a' };
  const input = { date: '2030-05-20', startTime: '10:30', endTime: '11:30', mode: 'virtual', location: '', isAvailable: true };
  const id = await service.createAvailabilitySlot(input);
  assert.notEqual(id, 'counselor-a'); assert.notEqual(id, input.date); assert.notEqual(id, input.startTime);
  // Legacy data.id must never override the actual document ID from the snapshot.
  rows.get('counselor_availability/' + id).id = 'wrong-embedded-id';
  await mount('AvailabilityScreen');
  assert.equal((await service.getOwnAvailability())[0].id, id);
  await press('Delete');
  assert.ok(rows.has('counselor_availability/' + id), 'Confirmation required');
  await press('Cancel'); assert.ok(rows.has('counselor_availability/' + id));
  await press('Delete');
  const readList = api.getDocs;
  api.getDocs = async () => { throw new Error('Delete must not reload the list'); };
  await press('Delete Slot');
  assert.ok(text(tree).includes('No availability slots yet.'), 'Immediate list removal without reread');
  assert.ok(!rows.has('counselor_availability/' + id), 'Actual document deleted');
  api.getDocs = readList;
  await mount('AvailabilityScreen');
  assert.ok(text(tree).includes('No availability slots yet.'), 'Refresh still shows no deleted slot');
  const editId = await service.createAvailabilitySlot(input);
  await mount('EditAvailabilityScreen', editId);
  await press('Delete'); await press('Keep Slot');
  assert.ok(rows.has('counselor_availability/' + editId));
  await press('Delete'); await press('Delete Slot');
  assert.equal(navigation.at(-1), '/counselor/availability');
  assert.ok(!rows.has('counselor_availability/' + editId));
  const failureId = await service.createAvailabilitySlot(input);
  await mount('AvailabilityScreen'); await press('Delete'); failCommit = true;
  await press('Delete Slot');
  assert.ok(text(tree).includes('Unable to delete this availability slot.'));
  assert.ok(rows.has('counselor_availability/' + failureId), 'Failed delete retains slot');
  assert.ok(loggedErrors.some(args => args[1]?.code === 'unavailable' && args[1]?.message === 'Simulated network failure'), 'Original Firebase code/message logged');
  auth.currentUser = { uid: 'counselor-b' };
  await press('Delete Slot');
  assert.ok(text(tree).includes('You can only delete your own availability slots.'));
  assert.ok(rows.has('counselor_availability/' + failureId));
  await assert.rejects(service.deleteAvailabilitySlot(failureId), /You can only delete your own availability slots/);
  auth.currentUser = null;
  await assert.rejects(service.deleteAvailabilitySlot(failureId), /You can only delete your own availability slots/);
  auth.currentUser = { uid: 'counselor-a' };
  await service.deleteAvailabilitySlot(failureId);
  await service.deleteAvailabilitySlot(failureId); // Already-deleted own slot is safe.
  const { AVAILABILITY_TIMES, availabilityTimeOptions, validateAvailabilityForm } = load('utils/availability-form');
  assert.equal(AVAILABILITY_TIMES.length, 21);
  assert.equal(AVAILABILITY_TIMES[0], '08:00'); assert.equal(AVAILABILITY_TIMES.at(-1), '18:00');
  assert.ok(availabilityTimeOptions('19:15').includes('19:15'), 'Legacy off-grid time preserved');
  assert.throws(() => validateAvailabilityForm({ ...input, date: '2020-01-01' }), /today or a future/);
  await mount('NewAvailabilityScreen'); await press('Create Slot');
  assert.ok(text(tree).includes('Select a date.'));
  function dateControl() { const control = nodes(tree).find(node => node.type === 'input' && node.props.type === 'date'); assert.ok(control); return control; }
  dateControl().props.onChange({ target: { value: input.date } }); await render();
  assert.ok(dateControl().props.min, 'Web calendar minimum date set');
  await press('Create Slot'); assert.ok(text(tree).includes('Select a start time.'));
  async function selectTime(label, time) {
    const field = nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith(label + ':'));
    assert.ok(field); field.props.onPress(); await render();
    const option = nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === time);
    assert.ok(option, 'Time option: ' + time); option.props.onPress(); await render();
  }
  await selectTime('Start time', '09:00');
  await press('Create Slot'); assert.ok(text(tree).includes('Select an end time.'));
  await selectTime('End time', '08:30');
  await press('Create Slot'); assert.ok(text(tree).includes('End time must be after start time.'));
  await selectTime('End time', '10:00'); await press('Create Slot');
  assert.equal(navigation.at(-1), '/counselor/availability');
  const createdSlot = (await service.getOwnAvailability())[0];
  assert.equal(createdSlot.date, input.date); assert.equal(createdSlot.startTime, '09:00'); assert.equal(createdSlot.endTime, '10:00');
  await mount('AvailabilityScreen'); assert.ok(text(tree).includes('09:00'));
  // Editing must display older valid times without coercing or losing them.
  await service.updateAvailabilitySlot(createdSlot.id, { ...input, startTime: '07:15', endTime: '19:15' });
  await mount('EditAvailabilityScreen', createdSlot.id);
  assert.equal(dateControl().props.value, input.date); assert.ok(text(tree).includes('07:15')); assert.ok(text(tree).includes('19:15'));
  await selectTime('Start time', '09:30'); await selectTime('End time', '11:00');
  dateControl().props.onChange({ target: { value: '2030-05-21' } }); await render(); await press('Save Changes');
  await mount('EditAvailabilityScreen', createdSlot.id);
  assert.equal(dateControl().props.value, '2030-05-21'); assert.ok(text(tree).includes('09:30')); assert.ok(text(tree).includes('11:00'));
  await service.updateAvailabilitySlot(createdSlot.id, { ...input, date: '2020-01-01' });
  await mount('EditAvailabilityScreen', createdSlot.id); await press('Save Changes');
  assert.ok(text(tree).includes('Select today or a future date.'));
  // Native picker selection/dismissal and local-date serialization with mocked native views.
  for (const os of ['android', 'ios']) {
    platform = os; frames = new Map(); focus = new Map(); effects = [];
    let selected = '';
    screen = () => React.createElement(uiLoad('components/availability-date-picker.native').AvailabilityDatePicker, { value: '', onChange: value => { selected = value; } });
    await render();
    nodes(tree).find(node => node.type === 'Pressable').props.onPress(); await render();
    const nativePicker = nodes(tree).find(node => node.type === 'NativeDatePicker'); assert.ok(nativePicker);
    assert.equal(nativePicker.props.minimumDate.getHours(), 0);
    nativePicker.props.onValueChange({}, new Date(2030, 4, 22, 12)); await render();
    if (os === 'ios') await press('Use Date');
    assert.equal(selected, '2030-05-22');
  }
  platform = 'web';
  const session = { studentId: 'student-a', counselorId: 'counselor-a', appointmentDate: input.date, appointmentTime: '10:30', sessionFormat: 'Virtual', status: 'booked' };
  const note = { appointmentId: 'session-a', studentId: 'student-a', note: 'Private pre-session note' };
  rows.set('appointments/session-a', session); rows.set('pre_session_notes/session-a', note);
  await mount('SessionDetailsScreen', 'session-a');
  assert.ok(text(tree).includes(note.note)); await press('Mark Completed');
  const originalRead = api.getDoc, originalTransaction = api.runTransaction;
  let statusWrites = 0;
  api.getDoc = async ref => { if (ref.key.startsWith('appointments/') || ref.key.startsWith('pre_session_notes/')) throw new Error('Unexpected session reload'); return originalRead(ref); };
  api.runTransaction = async (...args) => { statusWrites++; return originalTransaction(...args); };
  const updateStatus = findButton('Confirm Status');
  await Promise.all([updateStatus.props.onPress(), updateStatus.props.onPress()]); await render();
  assert.equal(statusWrites, 1); assert.equal(rows.get('appointments/session-a').status, 'completed');
  assert.ok(text(tree).includes('This session is closed.'), 'Status immediately reconciles without rereading');
  assert.equal(rows.get('pre_session_notes/session-a'), note, 'Counselor note remains read-only');
  api.getDoc = originalRead; api.runTransaction = originalTransaction;
  console.log('PASS: session status immediately updates without reread, duplicate presses locked, pre-session note unchanged.');
  console.log('PASS: calendar/time selection, required fields, date/time validation, create/list, edit/reload, legacy times, native Android/iOS callbacks. Native views/Firebase mocked.');
  console.log('PASS: actual document ID, list/edit confirmation, immediate removal without reread, refresh persistence, edit redirect, failure retention and Firebase logging, signed-out/foreign-owner rejection. Mock Firebase/router; not a live browser acceptance test.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
