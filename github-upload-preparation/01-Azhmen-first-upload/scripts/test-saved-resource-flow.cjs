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
async function mount(name, id = 'published') { resourceId = id; frames = new Map(); focus = new Map(); effects = []; screen = uiLoad('components/resource-screens')[name]; await render(); }
function nodes(node) { if (Array.isArray(node)) return node.flatMap(child => nodes(child)); if (!node || typeof node !== 'object') return []; return [node, ...nodes(node.props?.children)]; }
function text(node) { if (Array.isArray(node)) return node.map(text).join(' '); return typeof node === 'object' && node ? text(node.props?.children) : String(node ?? ''); }
function findButton(title) { const result = nodes(tree).find(node => (node.type === 'Button' && node.props.title === title) || (node.type === 'Pressable' && node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === title)); assert.ok(result, 'Expected button ' + title + '; actual screen: ' + text(tree)); return result; }
async function press(title) { const node = findButton(title); assert.ok(!node.props.disabled, title + ' is enabled'); await node.props.onPress(); await render(); }
async function test() {
  rows.set('users/student-a', { role: 'student' }); rows.set('users/student-b', { role: 'student' });
  const original = { title: 'Campus focus guide', description: 'One manageable task.', category: 'Focus', active: true };
  rows.set('resources/published', original);
  await mount('ResourceDetailScreen');
  const transaction = api.runTransaction;
  let writes = 0;
  api.runTransaction = async (...args) => { writes++; return transaction(...args); };
  const firstSave = findButton('Save Resource');
  await Promise.all([firstSave.props.onPress(), firstSave.props.onPress()]); await render();
  assert.equal(writes, 1, 'Two immediate save presses issue one transaction');
  api.runTransaction = transaction;
  assert.equal(findButton('Saved').props.disabled, true, 'Detail changes immediately after save');
  await mount('SavedResourcesScreen'); assert.ok(text(tree).includes(original.title));
  await mount('SavedResourcesScreen'); assert.ok(text(tree).includes(original.title), 'Reload persists saved item');
  async function enterNote(value) {
    const input = nodes(tree).find(node => node.type === 'Input' && node.props.label === 'Your personal note');
    assert.ok(input); input.props.onChangeText(value); await render();
  }
  // No saved-list reload is allowed while testing updates: display must use the updated parent record.
  const readSaved = api.getDocs;
  api.getDocs = async input => { if ((input.reference ?? input).key === 'saved_resources') throw new Error('Unexpected list reload'); return readSaved(input); };
  await press('Add Note'); await enterNote('  A helpful first note  '); await press('Save Note');
  assert.ok(text(tree).includes('A helpful first note')); assert.ok(!text(tree).includes('No personal note yet.'));
  assert.ok(text(tree).includes('Personal note saved.'), 'Successful note update supplies temporary feedback');
  assert.equal(rows.get('saved_resources/student-a_published').personalNote, 'A helpful first note');
  await press('Edit Note');
  assert.equal(nodes(tree).find(node => node.type === 'Input' && node.props.label === 'Your personal note').props.value, 'A helpful first note');
  await enterNote('  My edited note  ');
  writes = 0; api.runTransaction = async (...args) => { writes++; return transaction(...args); };
  const updateNote = findButton('Save Note'); await Promise.all([updateNote.props.onPress(), updateNote.props.onPress()]); await render();
  assert.equal(writes, 1, 'Personal note double press locked'); api.runTransaction = transaction;
  assert.ok(text(tree).includes('My edited note')); assert.ok(!text(tree).includes('A helpful first note'));
  await press('Add to Favorites'); findButton('Remove Favorite');
  assert.equal(rows.get('saved_resources/student-a_published').favorite, true);
  await press('Remove Favorite'); findButton('Add to Favorites');
  assert.equal(rows.get('saved_resources/student-a_published').favorite, false);
  await press('Edit Note'); await enterNote('   '); await press('Save Note');
  assert.ok(text(tree).includes('No personal note yet.')); assert.ok(!text(tree).includes('My edited note'));
  assert.equal(rows.get('saved_resources/student-a_published').personalNote, '');
  findButton('Add Note');
  api.getDocs = readSaved;

  await press('Remove from Saved'); assert.ok(text(tree).includes('No saved resources yet'), 'Remove updates immediately');
  assert.equal(rows.get('resources/published'), original, 'Original resource preserved');
  await mount('ResourceDetailScreen'); findButton('Save Resource');
  await mount('ResourceDetailScreen'); findButton('Save Resource');
  await press('Save Resource');
  const saved = load('services/saved-resources');
  await Promise.all([saved.saveResource('published'), saved.saveResource('published')]);
  assert.equal((await saved.getSavedResources()).length, 1);
  auth.currentUser = { uid: 'student-b', isAnonymous: false };
  await mount('SavedResourcesScreen'); assert.ok(text(tree).includes('No saved resources yet'));
  await saved.removeSavedResource('published');
  assert.ok(rows.has('saved_resources/student-a_published'), 'Second student cannot remove first student data');
  auth.currentUser = { uid: 'student-a', isAnonymous: false };
  const getDoc = api.getDoc;
  api.getDoc = async reference => { if (reference.key.startsWith('resources/')) throw new Error('Catalog read unavailable'); return getDoc(reference); };
  await mount('SavedResourcesScreen'); assert.ok(text(tree).includes('Resource details could not be refreshed'));
  await press('Remove from Saved');
  assert.ok(text(tree).includes('No saved resources yet'), 'Catalog error does not block Remove');
  api.getDoc = getDoc;
  await mount('ResourceDetailScreen', 'starter-stress-reset');
  api.getDoc = async reference => { if (reference.key.startsWith('resources/')) throw new Error('Catalog read unavailable'); return getDoc(reference); };
  await press('Save Resource'); findButton('Saved');
  await mount('SavedResourcesScreen'); assert.ok(text(tree).includes('A gentle stress reset'));
  failCommit = true; await press('Remove from Saved');
  assert.ok(text(tree).includes('Unable to remove this resource.'), 'Remove failure is visible and item remains');
  assert.ok(rows.has('saved_resources/student-a_starter-stress-reset'));
  await press('Remove from Saved'); assert.ok(text(tree).includes('No saved resources yet'));
  api.getDoc = getDoc;
  rows.delete('resources/published');
  await mount('ResourcesScreen');
  const library = findButton('Save');
  await library.props.onPress(); await render(); findButton('Saved');
  console.log('PASS: actual resource-screen Save/Saved, list/reload, single-tap removal, detail reset, duplicate prevention, ownership, catalog-failure recovery, starter saves, visible errors and library state updates.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
