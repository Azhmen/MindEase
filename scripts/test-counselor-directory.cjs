const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Service tests with an in-memory Firestore boundary; not deployed-rule tests.
const auth = { currentUser: { uid: 'student-a' } };
auth.authStateReady = async () => {};
const localStorage = new Map();
let anonymousIds = 0, sessionIds = 0;
const authEvents = [];
let failAnonymousSignIn = false;
const authApi = {
  signInAnonymously: async () => { authEvents.push('anonymous-sign-in'); if (failAnonymousSignIn) { failAnonymousSignIn = false; throw new Error('Anonymous sign-in failed'); } auth.currentUser = { uid: 'guest-' + ++anonymousIds, isAnonymous: true }; return { user: auth.currentUser }; },
  signOut: async () => { authEvents.push('sign-out-start'); await Promise.resolve(); auth.currentUser = null; authEvents.push('sign-out-finished'); },
  signInWithEmailAndPassword: async () => { auth.currentUser = { uid: 'student-a', isAnonymous: false }; return { user: auth.currentUser }; },
};
const storageApi = { getItem: async key => localStorage.get(key) ?? null, setItem: async (key, value) => localStorage.set(key, value), removeItem: async key => localStorage.delete(key) };
const rows = new Map(), subscribers = new Set();
let ids = 0, clock = 0, failNextCommit = false;
function ref(key) { return { key, id: key.split('/').at(-1) }; }
function keyOf(value) { return typeof value === 'string' ? value : value.key; }
function snapshot(value) {
  const key = keyOf(value);
  return { exists: () => rows.has(key), data: () => rows.get(key), id: key.split('/').at(-1) };
}
function querySnapshot(input) {
  const reference = input.reference ?? input;
  const prefix = keyOf(reference) + '/';
  let matching = [...rows].filter(([key, data]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/')
    && (!input.filter?.field || data[input.filter.field] === input.filter.value));
  if (input.filter?.order) matching = matching.sort((a, b) => a[1].createdAt.toMillis() - b[1].createdAt.toMillis());
  return { docs: matching.map(([key]) => snapshot(key)) };
}
function emit() { subscribers.forEach(subscription => subscription.callback(subscription.query.reference ? querySnapshot(subscription.query) : snapshot(subscription.query))); }
const api = {
  collection: (base, ...parts) => ref([base.key ?? '', ...parts].filter(Boolean).join('/')),
  doc: (base, ...parts) => ref([base.key ?? '', ...(parts.length ? parts : [String(++ids)])].filter(Boolean).join('/')),
  serverTimestamp: () => { const value = ++clock; return { seconds: value, nanoseconds: 0, toMillis: () => value }; },
  setDoc: async (reference, data) => { rows.set(keyOf(reference), data); emit(); },
  addDoc: async (reference, data) => { const next = ref(keyOf(reference) + '/' + String(++ids)); rows.set(next.key, data); emit(); return next; },
  getDoc: async reference => snapshot(reference),
  updateDoc: async (reference, data) => { rows.set(keyOf(reference), { ...rows.get(keyOf(reference)), ...data }); emit(); },
  deleteDoc: async reference => { rows.delete(keyOf(reference)); emit(); },
  where: (field, _, value) => ({ field, value }),
  orderBy: (order, direction) => ({ order, direction }),
  query: (reference, filter) => ({ reference, filter }),
  getDocs: async input => querySnapshot(input),
  runTransaction: async (_, callback) => {
    const pending = [];
    await callback({ get: async reference => snapshot(reference), set: (reference, data) => pending.push([keyOf(reference), data]), update: (reference, data) => pending.push([keyOf(reference), { ...rows.get(keyOf(reference)), ...data }]), delete: reference => pending.push([keyOf(reference), null]) });
    pending.forEach(([key, data]) => data === null ? rows.delete(key) : rows.set(key, data)); emit();
  },
  writeBatch: () => {
    const pending = [];
    return {
      set: (reference, data) => pending.push([keyOf(reference), data]),
      update: (reference, data) => pending.push([keyOf(reference), { ...rows.get(keyOf(reference)), ...data }]),
      commit: async () => { if (failNextCommit) { failNextCommit = false; throw new Error('Simulated network error'); } pending.forEach(([key, data]) => rows.set(key, data)); emit(); },
    };
  },
  onSnapshot: (query, callback, onError) => {
    const subscription = { query, callback, onError };
    subscribers.add(subscription);
    callback(query.reference ? querySnapshot(query) : snapshot(query));
    return () => subscribers.delete(subscription);
  },
};
const cache = {};
function load(relativePath) {
  if (cache[relativePath]) return cache[relativePath];
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', relativePath + '.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => {
    if (id === 'firebase/firestore') return api;
    if (id === 'firebase/auth') return authApi;
    if (id === '@react-native-async-storage/async-storage') return { __esModule: true, default: storageApi };
    if (id === 'expo-crypto') return { randomUUID: () => String(++sessionIds).padStart(8, '0') + '-0000-4000-a000-000000000000' };
    if (id === '@/config/firebase') return { auth, db: {} };
    return load(id.replace('@/', ''));
  } });
  return cache[relativePath] = exports;
}

async function testDirectory() {
  const chat = load('services/chat'), appointments = load('services/appointments');
  const profiles = load('services/user-profile'), schedule = load('services/counselor-management');
  rows.set('users/student-a', { uid: 'student-a', role: 'student' });
  for (const [id, name] of [['sara', 'Counselor Sara'], ['maya', 'Counselor Maya'], ['nimal', 'Counselor Nimal']]) {
    rows.set('users/' + id, { uid: id, name, role: 'counselor' });
    rows.set('counselor_directory/' + id, { name, active: true, specialization: 'Campus wellbeing' });
  }
  rows.set('counselor_directory/inactive', { name: 'Inactive', active: false });
  rows.set('counselor_directory/legacy', { name: 'Missing active' });
  rows.set('counselor_directory/no-booking', { name: 'Chat only', active: true, bookingAvailable: false });
  rows.set('counselor_directory/no-chat', { name: 'Booking only', active: true, chatAvailable: false });
  rows.set('counselor_availability/maya-slot', { counselorId: 'maya', date: '2099-10-20', startTime: '11:00', isAvailable: true });
  rows.set('counselor_availability/past', { counselorId: 'sara', date: '2000-10-20', startTime: '11:00', isAvailable: true });
  rows.set('counselor_availability/unpublished', { counselorId: 'nimal', date: '2099-10-20', startTime: '11:00', isAvailable: false });
  let chatRows = [], bookingRows = [], selectedSlots = [];
  const fail = error => { throw error; };
  const stopChat = chat.subscribeToActiveCounselors(value => chatRows = value, fail);
  const stopBooking = appointments.subscribeToBookingCounselors(value => bookingRows = value, fail);
  const stopSlots = schedule.subscribeToAvailableSlotsForBooking('maya', value => selectedSlots = value, fail);
  assert.equal(chatRows.length, 4); assert.equal(bookingRows.length, 4);
  assert.ok(!chatRows.some(row => ['inactive', 'legacy', 'no-chat'].includes(row.id)));
  assert.ok(!bookingRows.some(row => ['inactive', 'legacy', 'no-booking'].includes(row.id)));
  assert.equal(bookingRows.find(row => row.id === 'maya').bookable, true);
  assert.equal(bookingRows.find(row => row.id === 'sara').bookable, false);
  assert.equal(bookingRows.find(row => row.id === 'nimal').bookable, false);
  assert.equal(selectedSlots.length, 1); assert.equal(selectedSlots[0].counselorId, 'maya');
  assert.equal(chatRows.find(row => row.id === 'maya').specialization, 'Campus wellbeing');
  await chat.createOrGetChatThread('maya');
  assert.equal(rows.get('chat_threads/student-a').counselorId, 'maya');
  rows.set('counselor_directory/new', { name: 'New Counselor', active: true }); emit();
  assert.ok(chatRows.some(row => row.id === 'new')); assert.ok(bookingRows.some(row => row.id === 'new'));
  rows.get('counselor_directory/new').active = false; emit();
  assert.ok(!chatRows.some(row => row.id === 'new')); assert.ok(!bookingRows.some(row => row.id === 'new'));
  stopChat(); stopBooking(); stopSlots(); assert.equal(subscribers.size, 0);
  auth.currentUser = { uid: 'student-b' }; rows.set('users/student-b', { role: 'student' });
  await chat.createOrGetChatThread('nimal');
  assert.equal(rows.get('chat_threads/student-b').counselorId, 'nimal');
  auth.currentUser = { uid: 'new-owner', isAnonymous: false };
  rows.set('users/new-owner', { name: 'New Owner', role: 'counselor', email: 'private@example.test', bio: 'Private bio' });
  await profiles.ensureCurrentCounselorDirectory();
  const created = rows.get('counselor_directory/new-owner');
  assert.equal(created.active, true); assert.equal(created.bookingAvailable, true); assert.equal(created.chatAvailable, true);
  assert.ok(!('email' in created)); assert.ok(!('bio' in created));
  created.active = false; created.chatAvailable = false;
  await profiles.ensureCurrentCounselorDirectory();
  assert.equal(rows.get('counselor_directory/new-owner'), created);
  auth.currentUser = { uid: 'student-a' };
  await assert.rejects(profiles.ensureCurrentCounselorDirectory(), /counselor account/);
  assert.ok(!rows.has('counselor_directory/student-a'));
  auth.currentUser = { uid: 'guest', isAnonymous: true };
  let anonymousRows;
  const stopAnonymous = chat.subscribeToActiveCounselors(value => anonymousRows = value, fail);
  assert.ok(anonymousRows.some(row => row.id === 'maya')); stopAnonymous();
  console.log('PASS: three-counselor discovery, realtime addition/deactivation, per-feature flags, correct slot grouping and thread UID, safe idempotent provisioning, private-field exclusion, student/guest isolation.');
}
testDirectory().catch(error => { console.error(error); process.exitCode = 1; });
