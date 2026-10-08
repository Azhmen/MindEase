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
async function test() {
  const mood = load('services/mood'), chat = load('services/chat');
  await assert.rejects(mood.createMoodEntry('Invalid', ''), /select a mood/);
  const id = await mood.createMoodEntry('Good', '  My note  ');
  const first = await mood.getMoodEntry(id);
  assert.equal(first.note, 'My note'); assert.equal(first.userId, 'student-a'); assert.equal(first.moodScore, 4);
  await mood.updateMoodEntry(id, 'Low', '  Updated  ');
  const edited = await mood.getMoodEntry(id);
  assert.equal(edited.note, 'Updated'); assert.equal(edited.moodScore, 2); assert.equal(edited.createdAt, first.createdAt);
  const newestId = await mood.createMoodEntry('Great', 'Second check-in');
  assert.equal((await mood.getMoodEntriesForUser())[0].id, newestId);
  await mood.deleteMoodEntry(newestId);
  rows.set('mood_entries/foreign', { userId: 'student-b' });
  assert.equal((await mood.getMoodEntriesForUser()).length, 1);
  await assert.rejects(mood.deleteMoodEntry('foreign'), /own mood/);
  await mood.deleteMoodEntry(id); assert.equal((await mood.getMoodEntriesForUser()).length, 0);

  rows.set('users/student-a', { role: 'student' });
  rows.set('users/student-b', { role: 'student' });
  rows.set('users/counselor-a', { role: 'counselor' });
  rows.set('users/counselor-b', { role: 'counselor' });
  rows.set('counselor_directory/counselor-a', { name: 'Campus Counselor', active: true });
  rows.set('counselor_directory/counselor-b', { name: 'Inactive Counselor', active: false });
  assert.equal((await chat.getActiveCounselors()).length, 1);
  await assert.rejects(chat.createOrGetChatThread('counselor-b'), /no longer accepting/);
  let studentThread;
  const stopThread = chat.subscribeToStudentThread(thread => { studentThread = thread; }, error => { throw error; });
  assert.equal(studentThread, null);
  const threadId = await chat.createOrGetChatThread('counselor-a');
  assert.equal(threadId, 'student-a'); assert.equal(studentThread.counselorId, 'counselor-a');
  const createdAt = studentThread.createdAt;
  await chat.createOrGetChatThread('counselor-b');
  assert.equal(studentThread.counselorId, 'counselor-a'); assert.equal(studentThread.createdAt, createdAt);
  let studentMessages, counselorMessages, inbox;
  const stopStudentMessages = chat.subscribeToMessages(threadId, data => { studentMessages = data; }, error => { throw error; });
  assert.equal(studentMessages.length, 0);
  await assert.rejects(chat.sendMessage(threadId, '  '), /Enter a message/);
  await assert.rejects(chat.sendMessage(threadId, 'x'.repeat(2001)), /2,000/);
  await chat.sendMessage(threadId, '  Hello counselor  ');
  assert.equal(studentMessages[0].text, 'Hello counselor');
  assert.equal(studentMessages[0].senderId, 'student-a'); assert.equal(studentMessages[0].senderRole, 'student');
  assert.equal(studentThread.lastMessage, 'Hello counselor');

  auth.currentUser = { uid: 'counselor-a' };
  const stopInbox = chat.subscribeToCounselorThreads(data => { inbox = data; }, error => { throw error; });
  const stopCounselorMessages = chat.subscribeToMessages(threadId, data => { counselorMessages = data; }, error => { throw error; });
  assert.equal(inbox.length, 1); assert.equal(counselorMessages[0].text, 'Hello counselor');
  await chat.sendMessage(threadId, '  Hello, how can I help?  ');
  assert.equal(studentMessages.length, 2); assert.equal(studentMessages[1].senderRole, 'counselor');
  assert.equal(inbox[0].lastMessage, 'Hello, how can I help?');
  auth.currentUser = { uid: 'student-a' };
  await chat.sendMessage(threadId, 'I wanted to talk about exam stress.');
  assert.equal(counselorMessages.length, 3); assert.equal(counselorMessages[2].senderRole, 'student');
  assert.equal(studentMessages[0].senderRole, 'student'); assert.equal(studentMessages[1].senderRole, 'counselor');
  const sizeBefore = rows.size, previewBefore = studentThread.lastMessage;
  failNextCommit = true;
  await assert.rejects(chat.sendMessage(threadId, 'This save fails'), /network/);
  assert.equal(rows.size, sizeBefore); assert.equal(studentThread.lastMessage, previewBefore);
  auth.currentUser = { uid: 'counselor-b' };
  await assert.rejects(chat.getChatThread(threadId), /not assigned/);
  await assert.rejects(chat.sendMessage(threadId, 'Forbidden'), /not assigned/);
  auth.currentUser = { uid: 'student-b' };
  await assert.rejects(chat.getChatThread(threadId), /not assigned/);
  auth.currentUser = { uid: 'student-a' };
  stopThread(); stopStudentMessages(); stopInbox(); stopCounselorMessages(); assert.equal(subscribers.size, 0);
  delete cache['services/chat'];
  const reloaded = load('services/chat');
  const stopReload = reloaded.subscribeToMessages(threadId, data => { studentMessages = data; }, error => { throw error; });
  assert.equal(studentMessages.length, 3); assert.equal((await reloaded.getChatThread(threadId)).counselorId, 'counselor-a'); stopReload();
  const firstMessage = studentMessages[0], reply = studentMessages[1], latest = studentMessages[2];
  const stopEdits = chat.subscribeToMessages(threadId, data => { studentMessages = data; }, error => { throw error; });
  await assert.rejects(chat.updateOwnMessage(threadId, reply.id, 'Forbidden'), /own messages/);
  await assert.rejects(chat.deleteOwnMessage(threadId, reply.id), /own messages/);
  await assert.rejects(chat.updateOwnMessage(threadId, latest.id, '  '), /Enter a message/);
  await assert.rejects(chat.updateOwnMessage(threadId, latest.id, 'x'.repeat(2001)), /2,000/);
  // Real server timestamps in one batch are equal; mirror that here.
  rows.get('chat_threads/' + threadId).lastMessageAt = latest.createdAt;
  await chat.updateOwnMessage(threadId, latest.id, '  Updated exam question  ');
  let updated = studentMessages.find(message => message.id === latest.id);
  assert.equal(updated.text, 'Updated exam question'); assert.equal(updated.edited, true);
  assert.ok(updated.updatedAt); assert.equal(updated.createdAt, latest.createdAt);
  assert.equal(updated.senderId, latest.senderId); assert.equal(updated.senderRole, latest.senderRole);
  assert.equal(rows.get('chat_threads/' + threadId).lastMessage, updated.text);
  await chat.updateOwnMessage(threadId, firstMessage.id, 'Older message edited');
  assert.equal(rows.get('chat_threads/' + threadId).lastMessage, updated.text);
  await chat.deleteOwnMessage(threadId, latest.id);
  assert.equal(studentMessages.length, 2); assert.equal(rows.get('chat_threads/' + threadId).lastMessage, 'Message deleted');
  auth.currentUser = { uid: 'counselor-a' };
  await assert.rejects(chat.updateOwnMessage(threadId, firstMessage.id, 'Forbidden'), /own messages/);
  await assert.rejects(chat.deleteOwnMessage(threadId, firstMessage.id), /own messages/);
  await chat.updateOwnMessage(threadId, reply.id, 'Updated counselor reply');
  assert.equal(studentMessages.find(message => message.id === reply.id).edited, true);
  await chat.deleteOwnMessage(threadId, reply.id); assert.equal(studentMessages.length, 1);
  auth.currentUser = { uid: 'student-b' };
  await assert.rejects(chat.deleteOwnMessage(threadId, firstMessage.id), /not assigned/);
  auth.currentUser = { uid: 'student-a' };
  await assert.rejects(chat.deleteOwnMessage(threadId, latest.id), /no longer exists/);
  stopEdits(); assert.equal(subscribers.size, 0);
  auth.currentUser = null;
  await assert.rejects(chat.sendMessage(threadId, 'Hello'), /sign in/);
  assert.throws(() => chat.subscribeToMessages(threadId, () => {}, () => {}), /sign in/);
  await testAnonymous();
  console.log('PASS: preserved mood CRUD and live chat; student/counselor own edits/deletes; cross-participant rejection; edit metadata; latest/older previews; validation; live removal; persistence; listener cleanup.');
}

async function testAnonymous() {
  const session = load('services/anonymous-session'), mood = load('services/anonymous-mood'), chat = load('services/anonymous-chat');
  await session.startAnonymousSession();
  const firstSession = await session.getAnonymousSession();
  assert.ok(auth.currentUser.isAnonymous); assert.notEqual(firstSession.uid, firstSession.sessionId);
  await session.startAnonymousSession(); assert.deepEqual(await session.getAnonymousSession(), firstSession);
  assert.equal(localStorage.size, 1); assert.equal(localStorage.get(session.ANONYMOUS_SESSION_KEY), firstSession.sessionId);
  const moodId = await mood.createMoodEntry('Good', '  A guest note  ');
  const original = await mood.getMoodEntry(moodId);
  assert.equal(original.note, 'A guest note'); assert.equal(original.anonymousUid, firstSession.uid);
  assert.equal(original.sessionId, firstSession.sessionId); assert.equal(original.moodScore, 4);
  ['name', 'email', 'studentId', 'userId'].forEach(field => assert.ok(!(field in original)));
  await mood.updateMoodEntry(moodId, 'Low', ' Changed ');
  const updated = await mood.getMoodEntry(moodId);
  assert.equal(updated.moodScore, 2); assert.equal(updated.note, 'Changed'); assert.equal(updated.createdAt, original.createdAt);
  await assert.rejects(mood.createMoodEntry('Invalid', ''), /select a mood/);
  await assert.rejects(mood.createMoodEntry('Good', 'x'.repeat(501)), /500/);
  rows.set('anonymous_mood_entries/other', { anonymousUid: 'another-guest', sessionId: firstSession.sessionId });
  assert.equal((await mood.getMoodEntriesForUser()).length, 1);
  await assert.rejects(mood.updateMoodEntry('other', 'Good', ''), /own anonymous/);
  await assert.rejects(mood.deleteMoodEntry('other'), /own anonymous/);
  let guestThread, guestMessages, counselorMessages, inbox;
  const stopThread = await chat.subscribeToStudentThread(data => { guestThread = data; }, error => { throw error; });
  assert.equal(guestThread, null);
  const threadId = await chat.createOrGetChatThread('counselor-a');
  assert.equal(threadId, firstSession.sessionId); assert.equal(guestThread.anonymousUid, firstSession.uid);
  await chat.createOrGetChatThread('counselor-a');
  const storedThread = rows.get('anonymous_chat_threads/' + threadId);
  ['name', 'email', 'studentId', 'userId'].forEach(field => assert.ok(!(field in storedThread)));
  const stopGuestMessages = chat.subscribeToMessages(threadId, data => { guestMessages = data; }, error => { throw error; });
  await chat.sendMessage(threadId, ' Hello anonymously ');
  assert.equal(guestMessages[0].text, 'Hello anonymously'); assert.equal(guestMessages[0].senderId, firstSession.uid);
  const guestMessage = guestMessages[0];
  assert.equal(rows.get('anonymous_chat_threads/' + threadId + '/messages/' + guestMessage.id).senderType, 'anonymous');
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false };
  const stopInbox = chat.subscribeToCounselorThreads(data => { inbox = data; }, error => { throw error; });
  const stopCounselorMessages = chat.subscribeToMessages(threadId, data => { counselorMessages = data; }, error => { throw error; });
  assert.equal(inbox.length, 1); assert.equal(counselorMessages[0].senderId, '');
  await assert.rejects(chat.updateOwnMessage(threadId, guestMessage.id, 'Forbidden'), /own messages/);
  await assert.rejects(chat.deleteOwnMessage(threadId, guestMessage.id), /own messages/);
  await chat.sendMessage(threadId, 'Hello, I am here to listen.');
  assert.equal(guestMessages.length, 2); assert.equal(counselorMessages[1].senderId, 'counselor-a');
  const reply = counselorMessages[1];
  rows.get('anonymous_chat_threads/' + threadId).lastMessageAt = reply.createdAt;
  await chat.updateOwnMessage(threadId, reply.id, ' Updated counselor reply ');
  assert.equal(guestMessages[1].text, 'Updated counselor reply'); assert.equal(guestMessages[1].edited, true);
  assert.equal(rows.get('anonymous_chat_threads/' + threadId).lastMessage, 'Updated counselor reply');
  auth.currentUser = { uid: firstSession.uid, isAnonymous: true };
  await assert.rejects(chat.updateOwnMessage(threadId, reply.id, 'Forbidden'), /own messages/);
  await assert.rejects(chat.deleteOwnMessage(threadId, reply.id), /own messages/);
  await chat.updateOwnMessage(threadId, guestMessage.id, 'Guest edited');
  assert.equal(counselorMessages[0].text, 'Guest edited'); assert.equal(counselorMessages[0].edited, true);
  await chat.deleteOwnMessage(threadId, guestMessage.id); assert.equal(counselorMessages.length, 1);
  await assert.rejects(chat.sendMessage(threadId, '  '), /Enter a message/);
  auth.currentUser = { uid: 'counselor-b', isAnonymous: false };
  await assert.rejects(chat.sendMessage(threadId, 'Forbidden'), /not assigned/);
  auth.currentUser = { uid: firstSession.uid, isAnonymous: true };
  // Reload the service modules while retaining Firebase/local persistence.
  delete cache['services/anonymous-session']; delete cache['services/anonymous-chat'];
  assert.equal(JSON.stringify(await load('services/anonymous-session').getAnonymousSession()), JSON.stringify(firstSession));
  assert.equal((await load('services/anonymous-chat').getChatThread(threadId)).id, threadId);
  assert.equal((await mood.getMoodEntriesForUser()).length, 1);
  await mood.deleteMoodEntry(moodId); assert.equal((await mood.getMoodEntriesForUser()).length, 0);
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false };
  await chat.deleteOwnMessage(threadId, reply.id); assert.equal(guestMessages.length, 0);
  assert.equal(rows.get('anonymous_chat_threads/' + threadId).lastMessage, 'Message deleted');
  auth.currentUser = { uid: firstSession.uid, isAnonymous: true };
  stopThread(); stopGuestMessages(); stopInbox(); stopCounselorMessages(); assert.equal(subscribers.size, 0);
  await session.exitAnonymousSession(); assert.equal(auth.currentUser, null); assert.equal(localStorage.size, 0);
  await session.startAnonymousSession();
  const next = await session.getAnonymousSession();
  assert.notEqual(next.uid, firstSession.uid); assert.notEqual(next.sessionId, firstSession.sessionId);
  await assert.rejects(chat.getChatThread(threadId), /not your anonymous/);
  await session.exitAnonymousSession();
  await load('services/auth').loginUser('student@example.test', 'test-password');
  assert.equal(auth.currentUser.uid, 'student-a'); assert.equal(auth.currentUser.isAnonymous, false);
  authEvents.length = 0;
  const start = session.startAnonymousSession();
  assert.equal(session.startAnonymousSession(), start, 'Double taps share one authentication operation');
  await start;
  assert.deepEqual(authEvents, ['sign-out-start', 'sign-out-finished', 'anonymous-sign-in']);
  assert.equal(auth.currentUser.isAnonymous, true); assert.ok(rows.has('users/student-a'));
  const switchedSession = await session.getAnonymousSession();
  authEvents.length = 0;
  await session.startAnonymousSession();
  assert.equal(authEvents.length, 0); assert.deepEqual(await session.getAnonymousSession(), switchedSession);
  await session.exitAnonymousSession();
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false };
  authEvents.length = 0;
  await session.startAnonymousSession();
  assert.deepEqual(authEvents, ['sign-out-start', 'sign-out-finished', 'anonymous-sign-in']);
  assert.ok(rows.has('users/counselor-a')); assert.equal(auth.currentUser.isAnonymous, true);
  await session.exitAnonymousSession();
  failAnonymousSignIn = true;
  await assert.rejects(session.startAnonymousSession(), /Anonymous sign-in failed/);
  assert.equal(auth.currentUser, null); assert.equal(localStorage.size, 0);
  await session.startAnonymousSession(); // Failure releases the operation lock.
  assert.equal(auth.currentUser.isAnonymous, true);
  await session.exitAnonymousSession();
  await load('services/auth').loginUser('student@example.test', 'test-password');
  assert.equal(auth.currentUser.uid, 'student-a');
  assert.equal(localStorage.size, 0); assert.ok(!rows.has('users/' + firstSession.uid));
  console.log('PASS: guest start/reuse/exit; random local ID without identity; anonymous mood CRUD/isolation; both chat senders/live listeners/edit/delete; cross-sender and foreign-thread rejection; reload persistence; ordinary login preserved.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
