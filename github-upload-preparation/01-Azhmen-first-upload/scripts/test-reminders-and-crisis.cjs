const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function environment(native) {
  const cache = {}, storage = new Map(), scheduled = new Map(), rows = new Map();
  const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
  let permission = true, sends = 0, cancels = 0;
  const notifications = {
    setNotificationHandler: () => {}, setNotificationChannelAsync: async () => {},
    AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted: permission }), requestPermissionsAsync: async () => ({ granted: permission }),
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async id => { cancels++; scheduled.delete(id); },
    scheduleNotificationAsync: async request => { sends++; scheduled.set(request.identifier, request); return request.identifier; },
  };
  const api = {
    doc: (_, collection, id) => ({ key: collection + '/' + id }),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    runTransaction: async (_, action) => {
      const pending = [];
      await action({ get: async ref => ({ exists: () => rows.has(ref.key), data: () => rows.get(ref.key) }), update: (ref, value) => pending.push([ref.key, value]) });
      pending.forEach(([key, value]) => rows.set(key, { ...rows.get(key), ...value }));
    },
  };
  function load(name) {
    if (cache[name]) return cache[name];
    const suffix = native && name === 'services/reminder-notifications' ? '.native.ts' : '.ts';
    const source = fs.readFileSync(path.join(__dirname, '../src', name + suffix), 'utf8');
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date, console, require: id => id === '@/config/firebase' ? { auth, db: {} } : id === 'firebase/firestore' ? api : id === 'expo-notifications' ? notifications : id === 'react-native' ? { Platform: { OS: 'android' } } : id === '@react-native-async-storage/async-storage' ? { getItem: async k => storage.get(k) ?? null, setItem: async (k, v) => storage.set(k, v), removeItem: async k => storage.delete(k) } : load(id.replace('@/', '')),
    });
    return cache[name] = exports;
  }
  return { load, auth, storage, scheduled, rows, permission: value => { permission = value; }, counts: () => ({ sends, cancels }) };
}
function appointment(hours, id = 'booking') {
  const date = new Date(Date.now() + hours * 3600000);
  return { id, studentId: 'student-a', appointmentDate: [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'), appointmentTime: date.toTimeString().slice(0, 5), status: 'booked' };
}
async function test() {
  const native = environment(true), service = native.load('services/appointment-reminders'), entry = appointment(48);
  const first = await service.scheduleAppointmentReminders([entry], true, 'student-a');
  assert.equal(first.plan.length, 3); assert.equal(native.scheduled.size, 3);
  assert.equal(first.plan[0].appointmentAt - first.plan[0].fireAt, 24 * 3600000);
  assert.equal(first.plan[1].appointmentAt - first.plan[1].fireAt, 3600000);
  assert.equal(JSON.parse(native.storage.get('mindease_appointment_reminders:student-a')).length, 3);
  await service.scheduleAppointmentReminders([entry, entry], true, 'student-a');
  assert.equal(native.counts().sends, 3, 'Double confirmation/duplicate input must not schedule duplicates');
  const changed = { ...appointment(72), status: 'rescheduled' };
  await service.rescheduleAppointmentReminders([changed], true, 'student-a');
  assert.equal(native.counts().cancels, 3); assert.equal(native.counts().sends, 6);
  for (const request of native.scheduled.values()) assert.ok(request.content.data.fireAt !== first.plan.find(item => item.id === request.identifier).fireAt);
  await service.scheduleAppointmentReminders([{ ...changed, status: 'cancelled' }], true, 'student-a');
  assert.equal(native.scheduled.size, 0);
  await service.scheduleAppointmentReminders([entry], false, 'student-a');
  assert.equal(native.scheduled.size, 0); assert.equal(JSON.parse(native.storage.get('mindease_appointment_reminders:student-a')).length, 0);
  native.permission(false);
  assert.equal((await service.scheduleAppointmentReminders([entry], true, 'student-a')).delivery, 'permission-denied');
  assert.equal(native.scheduled.size, 0);
  await service.cancelAppointmentReminders('student-a'); assert.ok(!native.storage.has('mindease_appointment_reminders:student-a'));
  assert.ok(Object.values(JSON.parse(native.storage.get('mindease_appointment_reminder_status:student-a'))).every(item => !item.reminder24hScheduled && !item.reminder1hScheduled && !item.sessionStartScheduled));
  native.auth.currentUser.uid = 'student-b';
  await assert.rejects(service.scheduleAppointmentReminders([entry], true, 'student-a'), /account changed/);
  native.auth.currentUser = { uid: 'guest', isAnonymous: true };
  await assert.rejects(service.scheduleAppointmentReminders([entry], true, 'guest'), /account changed/);
  const web = environment(false), webService = web.load('services/appointment-reminders');
  const due = await webService.scheduleAppointmentReminders([appointment(0.5)], true, 'student-a');
  assert.equal(due.delivery, 'in-app'); assert.ok(due.plan.some(item => item.fireAt < Date.now()));
  assert.equal(web.scheduled.size, 0);
  assert.equal((await webService.scheduleAppointmentReminders([{ ...entry, studentId: 'student-b' }], true, 'student-a')).plan.length, 0);
  assert.equal((await webService.scheduleAppointmentReminders([appointment(-1)], true, 'student-a')).plan.length, 0);
  const profile = web.load('services/user-profile');
  web.rows.set('users/student-a', { uid: 'student-a', role: 'student', email: 'student@example.test', name: 'Student', createdAt: 'ORIGINAL' });
  await profile.setAppointmentRemindersEnabled(true, 'student-a');
  assert.equal(web.rows.get('users/student-a').appointmentRemindersEnabled, true);
  assert.equal(web.rows.get('users/student-a').createdAt, 'ORIGINAL');
  assert.equal(web.rows.get('users/student-a').email, 'student@example.test');
  await profile.setAppointmentRemindersEnabled(false, 'student-a');
  assert.equal(web.rows.get('users/student-a').appointmentRemindersEnabled, false);
  await assert.rejects(profile.setAppointmentRemindersEnabled(true, 'student-b'), /account changed/);
  web.auth.currentUser = { uid: 'guest', isAnonymous: true };
  await assert.rejects(profile.setAppointmentRemindersEnabled(true, 'guest'), /account changed/);
  const { detectCrisisCue } = web.load('utils/crisis-cues');
  for (const text of ['Exam stress', 'I am anxious', 'I feel overwhelmed', "I don't want to die", 'I am not in immediate danger']) assert.equal(detectCrisisCue(text), false, text);
  for (const text of ['I want to die', 'I cannot stay safe', 'I took an overdose', "I don’t want to die but I cannot stay safe"]) assert.equal(detectCrisisCue(text), true, text);
  console.log('PASS: native 24h/1h/session-start scheduling, duplicate prevention, reschedule/cancel/disabled preference, permission fallback, web due state, account isolation, settings-only persistence, conservative crisis cues.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
