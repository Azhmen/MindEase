// Actual login/register handlers and profile service, with isolated Firebase boundaries.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), React = require('react'), { FirebaseError } = require('firebase/app');
const auth = { currentUser: null }, rows = new Map(), accounts = new Map(), cache = {};
let slots = [], index = 0, route = '', registrations = 0, anonymous = 0, failProfile = false;
const react = { ...React, useState: initial => { const key = index++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], value => { slots[key] = typeof value === 'function' ? value(slots[key]) : value; }]; }, useRef: initial => { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; }, useCallback: callback => callback };
const widget = props => React.createElement('Widget', props, props.children);
const firestore = {
  doc: (_, collection, uid) => ({ key: collection + '/' + uid }), serverTimestamp: () => 'SERVER_TIME',
  getDoc: async ref => ({ exists: () => rows.has(ref.key), data: () => rows.get(ref.key) }),
  runTransaction: async (_, action) => {
    const writes = [];
    await action({ get: firestore.getDoc, set: (ref, data) => writes.push([ref.key, data]) });
    writes.forEach(([key, data]) => rows.set(key, data));
    if (failProfile) { failProfile = false; throw new Error('Uncertain profile response'); }
  },
};
const firebaseAuth = {
  createUserWithEmailAndPassword: async (_, email, password) => {
    registrations++;
    if (accounts.has(email)) throw new FirebaseError('auth/email-already-in-use', 'raw error');
    const user = { uid: 'account-' + registrations, email, isAnonymous: false };
    accounts.set(email, { user, password }); auth.currentUser = user; return { user };
  },
  signInWithEmailAndPassword: async (_, email, password) => { const account = accounts.get(email); if (!account || account.password !== password) throw new FirebaseError('auth/invalid-credential', 'raw error'); auth.currentUser = account.user; return { user: account.user }; },
  signOut: async () => { auth.currentUser = null; },
};
function load(name) {
  if (cache[name]) return cache[name];
  const file = path.join(__dirname, '../src', name + (name.startsWith('app/') ? '.tsx' : '.ts'));
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, Error, require: id => {
    if (id === 'react') return react;
    if (id === 'react-native') return { Pressable: 'Pressable', View: 'View', ActivityIndicator: 'Spinner' };
    if (id === 'expo-router') return { useRouter: () => ({ push: value => { route = value; }, replace: value => { route = value; } }), useFocusEffect: () => {} };
    if (id === '@/config/firebase') return { auth, db: {} };
    if (id === 'firebase/auth') return firebaseAuth;
    if (id === 'firebase/firestore') return firestore;
    if (id === 'firebase/app') return { FirebaseError };
    if (id === '@/services/anonymous-session') return { startAnonymousSession: async () => { anonymous++; auth.currentUser = { uid: 'guest', isAnonymous: true }; } };
    if (id === '@/components/care-login-layout') return { CareLoginLayout: widget, CareField: widget, RoleSelector: widget, CareDivider: widget, careLoginStyles: {} };
    if (id.startsWith('@/components/')) return { AuthScreen: widget, AuthError: widget, AppCard: widget, AppTextInput: widget, PrimaryButton: widget, AppText: widget, CareIcon: widget };
    if (id === '@/constants/colors') return { Colors: {} };
    if (id.startsWith('@/')) return load(id.slice(2));
    return require(id);
  } });
  return cache[name] = exports;
}
function nodes(value) { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : []; }
function find(tree, predicate) { const result = nodes(tree).find(predicate); assert.ok(result); return result; }
function render(component) { index = 0; return component(); }
async function test() {
  const Login = load('app/login').default, Register = load('app/register').default;
  slots = []; let tree = render(Login);
  find(tree, n => n.props?.accessibilityLabel === "Don't have an account? Create Account").props.onPress(); assert.equal(route, '/register');
  for (const role of ['student', 'counselor']) {
    slots = []; route = ''; tree = render(Register);
    await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
    assert.equal(registrations, role === 'student' ? 0 : 1, 'Blank name does not create Auth user');
    for (const [label, value] of [['Full Name', '  New ' + role + '  '], ['Email', '  ' + role + '@example.test  '], ['Password', '  secure123  '], ['Confirm Password', '  secure123  ']]) find(tree, n => n.props?.label === label).props.onChangeText(value);
    find(tree, n => n.props?.role && n.props?.onChange).props.onChange(role);
    tree = render(Register);
    const action = find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress;
    await Promise.all([action(), action()]);
    assert.equal(route, role === 'student' ? '/student/home' : '/counselor/dashboard');
    const saved = rows.get('users/' + auth.currentUser.uid);
    assert.equal(saved.name, 'New ' + role); assert.equal(saved.role, role); assert.equal(saved.email, role + '@example.test');
    assert.equal(saved.appointmentRemindersEnabled, false); assert.ok(saved.createdAt);
    assert.deepEqual(Object.keys(saved).sort(), ['uid', 'name', 'email', 'role', 'createdAt', 'appointmentRemindersEnabled'].sort());
    assert.ok(!rows.has('counselor_directory/' + saved.uid), 'Directory remains admin-managed');
    await firebaseAuth.signOut(); slots = []; tree = render(Login);
    find(tree, n => n.props?.label === 'Email or ID').props.onChangeText(saved.email);
    find(tree, n => n.props?.label === 'Password').props.onChangeText('secure123');
    find(tree, n => n.props?.role && n.props?.onChange).props.onChange(role);
    tree = render(Login); await find(tree, n => n.props?.onPress?.name === 'handleLogin').props.onPress();
    assert.equal(route, role === 'student' ? '/student/home' : '/counselor/dashboard');
  }
  slots = []; tree = render(Register);
  for (const [label, value] of [['Full Name', 'Retry Student'], ['Email', 'retry@example.test'], ['Password', 'secure123'], ['Confirm Password', 'secure123']]) find(tree, n => n.props?.label === label).props.onChangeText(value);
  failProfile = true; tree = render(Register); await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
  tree = render(Register); const count = registrations, original = rows.get('users/' + auth.currentUser.uid);
  await find(tree, n => n.props?.title === 'Retry profile').props.onPress(); assert.equal(registrations, count); assert.equal(rows.get('users/' + auth.currentUser.uid), original);
  const profiles = load('services/user-profile');
  await assert.rejects(profiles.createUserProfile({ uid: 'other', name: 'Forged', email: 'retry@example.test', role: 'student' }), /account changed/);
  slots = []; tree = render(Register);
  for (const [label, value] of [['Full Name', 'Validation'], ['Email', 'invalid'], ['Password', '123'], ['Confirm Password', '456']]) find(tree, n => n.props?.label === label).props.onChangeText(value);
  tree = render(Register); await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
  assert.equal(registrations, count);
  tree = render(Register); assert.ok(nodes(tree).some(n => n.props?.message === 'Please enter a valid email address.'));
  find(tree, n => n.props?.label === 'Email').props.onChangeText('student@example.test');
  tree = render(Register); await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
  tree = render(Register); assert.ok(nodes(tree).some(n => n.props?.message?.includes('at least 6')));
  find(tree, n => n.props?.label === 'Password').props.onChangeText('secure123');
  tree = render(Register); await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
  tree = render(Register); assert.ok(nodes(tree).some(n => n.props?.message === 'Passwords do not match.'));
  find(tree, n => n.props?.label === 'Confirm Password').props.onChangeText('secure123');
  tree = render(Register); await find(tree, n => n.props?.title === 'Create Account' && n.props.onPress).props.onPress();
  tree = render(Register); assert.ok(nodes(tree).some(n => n.props?.message?.includes('already exists')));
  slots = []; tree = render(Login); await find(tree, n => n.props?.onPress?.name === 'handleAnonymous').props.onPress(); assert.equal(route, '/anonymous/home'); assert.equal(anonymous, 1);
  slots = []; tree = render(Register); find(tree, n => n.props?.onPress && n.props?.children?.props?.children === 'Already have an account? Sign In').props.onPress(); assert.equal(route, '/login');
  const { getAuthErrorMessage } = load('utils/auth');
  for (const code of ['auth/email-already-in-use', 'auth/invalid-email', 'auth/weak-password', 'auth/network-request-failed']) assert.notEqual(getAuthErrorMessage(new FirebaseError(code, 'raw error')), 'raw error');
  console.log('PASS: login Create Account link, student/counselor registration/role routes, exact profile schema/no passwords, double-tap lock, idempotent profile retry, login/logout, anonymous/back navigation, ownership and readable Firebase errors.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
