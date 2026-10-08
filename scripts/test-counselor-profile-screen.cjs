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
  writeBatch: () => { const pending = []; return { delete: reference => pending.push(reference.key), commit: async () => { if (failCommit) { failCommit = false; throw new Error('Simulated network failure'); } pending.forEach(key => rows.delete(key)); } }; },
  serverTimestamp: () => { const value = ++clock; return { toMillis: () => value }; },
  runTransaction: async (_, callback) => {
    const pending = [];
    await callback({
      get: async reference => snapshot(reference),
      set: (reference, data) => pending.push([reference.key, data]),
      update: (reference, data) => pending.push([reference.key, { ...rows.get(reference.key), ...data }]),
      delete: reference => pending.push([reference.key, null]),
    });
    if (failCommit) { failCommit = false; throw new Error('Simulated network failure'); }
    pending.forEach(([key, data]) => data === null ? rows.delete(key) : rows.set(key, data));
  },
};
function load(name) {
  if (cache[name]) return cache[name];
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name + '.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Error, __DEV__: true, console: { error: (...args) => loggedErrors.push(args) }, require: id => id === 'firebase/firestore' ? api : id === 'firebase/app' ? require('firebase/app') : id === '@/config/firebase' ? { db: {}, auth } : id === '@/services/auth' ? { getCurrentUser: () => auth.currentUser } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
// Exercise actual resource screens and services; only native widgets/router/Firebase are mocked.
const React = require('react');
let frame, frames = new Map(), focus = new Map(), effects = [], uiCache = {}, resourceId = 'published', tree;
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
    if (id === 'react-native') return { ActivityIndicator: 'Spinner', Pressable: 'Pressable', View: 'View', StyleSheet: { create: value => value } };
    if (id === 'expo-router') return { useRouter: () => ({ push() {}, replace() {} }), useLocalSearchParams: () => ({ id: resourceId }), useFocusEffect: callback => { if (focus.get(frame.key) !== callback) { focus.set(frame.key, callback); effects.push(callback); } } };
    if (id === '@/components/presentation') return { BotanicalArt: widget('Art'), FormPanel: widget('Form'), StepRail: widget('Progress'), presentation: {} };
    if (id === '@/components/wellness-ui') return {
      WellnessHeroCard: widget('Hero'), FeatureBanner: widget('Banner'), QuickActionTile: props => React.createElement('Button', props, props.title), StatTile: widget('Stat'), SectionHeader: widget('Section'), StatusChip: widget('Chip'), IllustratedEmptyState: props => React.createElement('Empty', props, [props.title, props.description, props.children]), SettingsRow: button, wellnessLayout: {},
    };
    if (id === '@/components/text') return { AppText: widget('Text') };
    if (id === '@/components/app-text-input') return { AppTextInput: widget('Input') };
    if (id === '@/components/care-icon') return { CareIcon: widget('Icon') };
    if (id === '@/components/student-ui') return { CareButton: button, StudentCard: widget('Card'), studentStyles: {} };
    if (id === '@/components/student-screen') return { StudentScreen: widget('Screen'), StatusMessage: ({ message }) => React.createElement('Text', {}, message) };
    if (id === '@/components/counselor-ui') return { CounselorScreen: widget('Screen') };
    if (id === '@/components/logout-button') return { LogoutButton: () => button({ title: 'Logout' }) };
    if (id === '@/components/gihani-ui') return uiLoad('components/gihani-ui');
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
async function mount(name, id = 'published') { resourceId = id; frames = new Map(); focus = new Map(); effects = []; screen = uiLoad('app/counselor/profile').default; await render(); }
function nodes(node) { if (Array.isArray(node)) return node.flatMap(child => nodes(child)); if (!node || typeof node !== 'object') return []; return [node, ...nodes(node.props?.children)]; }
function text(node) { if (Array.isArray(node)) return node.map(text).join(' '); return typeof node === 'object' && node ? text(node.props?.children) : String(node ?? ''); }
function findButton(title) { const result = nodes(tree).find(node => node.type === 'Button' && node.props.title === title); assert.ok(result, 'Expected button ' + title + '; actual screen: ' + text(tree)); return result; }
async function press(title) { const node = findButton(title); assert.ok(!node.props.disabled, title + ' is enabled'); await node.props.onPress(); await render(); }
async function test() {
  const original = { uid: 'counselor-a', name: 'Original Counselor', email: 'counselor@example.test', role: 'counselor', createdAt: api.serverTimestamp() };
  rows.set('users/counselor-a', original); rows.set('counselor_directory/counselor-a', { name: original.name, active: true });
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false };
  await mount();
  assert.ok(text(tree).includes(original.name) && text(tree).includes(original.email));
  assert.ok(!text(tree).includes('Coming soon')); findButton('Open Support Options'); findButton('Logout');
  await press('Edit Profile');
  async function enter(label, value) { const input = nodes(tree).find(node => node.type === 'Input' && node.props.label === label); assert.ok(input, label); input.props.onChangeText(value); await render(); }
  assert.ok(!nodes(tree).some(node => node.type === 'Input' && ['Email', 'Role'].includes(node.props.label)));
  await enter('Name', 'Cancelled draft'); await press('Cancel');
  assert.equal(rows.get('users/counselor-a'), original); assert.ok(text(tree).includes(original.name));
  await press('Edit Profile'); await enter('Name', '   '); await press('Save Changes');
  assert.ok(text(tree).includes('Enter your name.')); assert.equal(rows.get('users/counselor-a'), original);
  await enter('Name', '  Updated Counselor  '); await enter('Professional Title', '  Campus Counselor  '); await enter('Specialization', '  Academic wellbeing  '); await enter('Short Bio', '  Updated biography  ');
  failCommit = true; await press('Save Changes'); assert.ok(text(tree).includes('Simulated network failure')); assert.equal(rows.get('users/counselor-a'), original);
  await press('Save Changes');
  assert.ok(text(tree).includes('Profile updated.') && text(tree).includes('Updated Counselor') && text(tree).includes('Updated biography'));
  findButton('Edit Profile');
  assert.equal(rows.get('users/counselor-a').role, 'counselor'); assert.equal(rows.get('users/counselor-a').email, original.email);
  assert.equal(rows.get('counselor_directory/counselor-a').title, 'Campus Counselor');
  assert.ok(!('bio' in rows.get('counselor_directory/counselor-a')));
  await mount(); assert.ok(text(tree).includes('Updated biography') && text(tree).includes('Updated Counselor'));
  console.log('PASS: actual counselor profile load/Edit/Cancel/validation/error/Save/reload handlers, immutable email/role, public sync, Support Options and Logout controls.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
