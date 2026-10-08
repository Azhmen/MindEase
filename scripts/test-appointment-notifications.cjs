const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function environment(native, development = true, platform = 'android') {
  const cache = {}, storage = new Map(), scheduled = new Map(), rows = new Map();
  const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
  let permission = true, permissionStatus = 'granted', permissionRequests = 0, sends = 0, cancels = 0; const immediate = [];
  const notifications = {
    setNotificationHandler: () => {}, setNotificationChannelAsync: async () => {},
    AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted: permission, status: permissionStatus }), requestPermissionsAsync: async () => { permissionRequests++; permissionStatus = permission ? 'granted' : 'denied'; return { granted: permission, status: permissionStatus }; },
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async id => { cancels++; scheduled.delete(id); },
    scheduleNotificationAsync: async request => { sends++; if (request.trigger?.type === 'date') scheduled.set(request.identifier, request); else immediate.push(request); return request.identifier; },
  };
  const api = {
    collection: (_, name) => ({ key: name }),
    doc: (_, collection, id) => ({ key: collection + '/' + id }),
    getDoc: async ref => ({ exists: () => rows.has(ref.key), data: () => rows.get(ref.key), id: ref.key.split('/').at(-1) }),
    where: (field, _, value) => ({ field, value }), query: (ref, filter) => ({ ref, filter }),
    getDocs: async input => ({ docs: [...rows].filter(([key, data]) => key.startsWith(input.ref.key + '/') && data[input.filter.field] === input.filter.value).map(([key, data]) => ({ id: key.split('/').at(-1), data: () => data })) }),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    runTransaction: async (_, action) => {
      const pending = [];
      await action({ get: async ref => ({ exists: () => rows.has(ref.key), data: () => rows.get(ref.key) }), set: (ref, value) => pending.push([ref.key, value]), update: (ref, value) => pending.push([ref.key, value]) });
      pending.forEach(([key, value]) => rows.set(key, { ...rows.get(key), ...value }));
    },
  };
  function load(name) {
    if (cache[name]) return cache[name];
    const suffix = native && name === 'services/reminder-notifications' ? '.native.ts' : '.ts';
    const source = fs.readFileSync(path.join(__dirname, '../src', name + suffix), 'utf8');
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date, Error, __DEV__: development, console, require: id => id === '@/config/firebase' ? { auth, db: {} } : id === 'firebase/firestore' ? api : id === 'expo-notifications' ? notifications : id === 'react-native' ? { Platform: { OS: platform } } : id === '@react-native-async-storage/async-storage' ? { getItem: async k => storage.get(k) ?? null, setItem: async (k, v) => storage.set(k, v), removeItem: async k => storage.delete(k) } : load(id.replace('@/', '')),
    });
    return cache[name] = exports;
  }
  return { load, auth, storage, scheduled, rows, immediate, reload: () => { delete cache['services/appointment-reminders']; }, permission: (value, status = value ? 'granted' : 'denied') => { permission = value; permissionStatus = status; }, counts: () => ({ sends, cancels, permissionRequests }) };
}
function appointment(hours, id = 'booking') {
  const date = new Date(Date.now() + hours * 3600000);
  return { id, studentId: 'student-a', appointmentDate: [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'), appointmentTime: date.toTimeString().slice(0, 5), status: 'booked' };
}
function serviceDate(entry) { return environment(false).load('utils/appointment-reminder-plan').formattedAppointmentSchedule(entry.appointmentDate, entry.appointmentTime); }
async function test() {
  for (const isNative of [true, false]) {
    const env = environment(isNative), service = env.load('services/appointment-reminders'), crud = env.load('services/appointments');
    env.rows.set('users/student-a', { role: 'student', appointmentRemindersEnabled: true });
    env.rows.set('counselor_directory/counselor-a', { name: 'Campus Counselor', active: true });
    const future = appointment(48), details = { ...future, counselorId: 'counselor-a', sessionFormat: 'Virtual' };
    await crud.createAppointment('booking', 'student-a', details);
    const original = JSON.stringify(env.rows.get('appointments/booking'));
    let latest;
    const stop = service.subscribeAppointmentReminderState('student-a', value => { latest = value; });
    await Promise.all([service.handleAppointmentReminderEvent('booking', 'confirmed'), service.handleAppointmentReminderEvent('booking', 'confirmed')]);
    assert.equal(latest.event.title, 'Appointment Confirmed'); assert.ok(latest.event.body.includes(serviceDate(future).date));
    assert.ok(latest.event.body.includes('Campus Counselor'));
    assert.ok(latest.event.body.includes(serviceDate(future).time));
    if (isNative) {
      assert.equal(env.immediate[0].content.title, 'Appointment Confirmed');
      assert.equal(env.immediate[0].content.body, `You have an appointment with Campus Counselor on ${serviceDate(future).date} at ${serviceDate(future).time}.`);
      assert.ok([...env.scheduled.values()].some(item => item.content.title === 'Appointment Tomorrow'));
      assert.ok([...env.scheduled.values()].some(item => item.content.title === 'Appointment in 1 Hour'));
    }
    assert.equal(latest.statuses.booking.confirmationSent, true);
    for (const field of ['reminder24hScheduled', 'reminder1hScheduled', 'sessionStartScheduled']) assert.equal(latest.statuses.booking[field], true, field);
    assert.equal(JSON.stringify(env.rows.get('appointments/booking')), original, 'Reminder layer never changes booking fields');
    assert.equal(env.immediate.length, isNative ? 1 : 0, 'No duplicate confirmation');
    assert.equal(env.scheduled.size, isNative ? 3 : 0);
    if (isNative) {
      const start = [...env.scheduled.values()].find(item => item.identifier.endsWith(':0'));
      assert.equal(start.content.title, 'Your Session Is Starting'); assert.ok(start.content.body.includes('Campus Counselor'));
    }
    const oldTimes = new Map([...env.scheduled.values()].map(item => [item.identifier, item.content.data.fireAt]));
    const changed = { ...appointment(72), sessionFormat: 'Virtual' };
    await crud.updateAppointment('booking', changed); await service.handleAppointmentReminderEvent('booking', 'rescheduled');
    assert.equal(latest.event.title, 'Appointment Rescheduled'); assert.equal(env.scheduled.size, isNative ? 3 : 0);
    for (const request of env.scheduled.values()) assert.notEqual(oldTimes.get(request.identifier), request.content.data.fireAt, 'Old triggers removed');
    assert.equal(env.immediate.filter(item => item.content.title === 'Appointment Confirmed').length, isNative ? 1 : 0);
    await crud.cancelAppointment('booking'); await service.handleAppointmentReminderEvent('booking', 'cancelled');
    assert.equal(latest.event.title, 'Appointment Cancelled'); assert.equal(latest.plan.length, 0); assert.equal(env.scheduled.size, 0);
    for (const field of ['reminder24hScheduled', 'reminder1hScheduled', 'sessionStartScheduled']) assert.equal(latest.statuses.booking[field], false);
    assert.equal(JSON.parse(env.storage.get('mindease_appointment_reminders:student-a')).length, 0, 'No stale plan metadata');
    env.rows.get('users/student-a').appointmentRemindersEnabled = false;
    await crud.createAppointment('disabled', 'student-a', details); await service.handleAppointmentReminderEvent('disabled', 'confirmed');
    assert.equal(latest.event.title, 'Appointment Confirmed'); assert.equal(latest.statuses.disabled.confirmationSent, true);
    assert.equal(latest.enabled, false); assert.equal(latest.plan.length, 0); assert.equal(env.scheduled.size, 0);
    const sentBefore = env.immediate.length; stop(); env.reload();
    await env.load('services/appointment-reminders').handleAppointmentReminderEvent('disabled', 'confirmed');
    assert.equal(env.immediate.length, sentBefore, 'Confirmation dedupe survives service/browser reload');
    assert.ok(!env.storage.get('mindease_appointment_reminder_status:student-a').includes('Campus Counselor'), 'No payload persisted in tracking');
    service.subscribeAppointmentReminderState('student-a', value => { latest = value; });
    await service.sendTestAppointmentReminder('disabled');
    assert.equal(latest.event.title, 'MindEase test reminder');
  }
  const denied = environment(true), service = denied.load('services/appointment-reminders');
  denied.permission(false); denied.rows.set('users/student-a', { role: 'student', appointmentRemindersEnabled: true });
  denied.rows.set('appointments/booking', { ...appointment(48), counselorName: 'Campus Counselor' });
  let state; service.subscribeAppointmentReminderState('student-a', value => { state = value; });
  await service.handleAppointmentReminderEvent('booking', 'confirmed');
  assert.equal(state.delivery, 'permission-denied'); assert.equal(state.event.title, 'Appointment Confirmed');
  assert.equal(state.statuses.booking.confirmationDelivery, 'permission-denied'); assert.equal(denied.scheduled.size, 0);
  assert.equal(state.error, 'Appointment booked. Enable notifications in your device settings to receive reminders.');
  denied.rows.get('users/student-a').appointmentRemindersEnabled = false;
  denied.rows.set('appointments/disabled', { ...appointment(48, 'disabled'), counselorName: 'Campus Counselor' });
  await service.handleAppointmentReminderEvent('disabled', 'confirmed');
  assert.equal(state.enabled, false); assert.equal(state.delivery, 'permission-denied');
  assert.ok(state.error.includes('Enable notifications')); assert.equal(denied.immediate.length, 0);
  assert.equal(denied.counts().permissionRequests, 0, 'Do not repeatedly request denied permission');
  for (const platform of ['android', 'ios']) {
    const phone = environment(true, true, platform), nativeApi = phone.load('services/reminder-notifications');
    phone.permission(true, 'undetermined');
    assert.equal(await nativeApi.showImmediateNotification('test', 'Appointment Confirmed', 'Real appointment'), 'native');
    assert.equal(phone.counts().permissionRequests, 1);
    assert.equal(phone.immediate.length, 1);
    if (platform === 'ios') assert.equal(phone.immediate[0].trigger, null);
    else assert.equal(phone.immediate[0].trigger.channelId, 'appointments');
    await nativeApi.requestReminderPermission();
    assert.equal(phone.counts().permissionRequests, 1, 'Granted permission is checked without prompting');
  }
  const { buildAppointmentReminderPlan, dueAppointmentReminder } = denied.load('utils/appointment-reminder-plan');
  const atStart = Date.now(), entry = { ...appointment(0), appointmentTime: new Date(atStart).toTimeString().slice(0, 5) };
  const at = new Date(entry.appointmentDate + 'T' + entry.appointmentTime + ':00').getTime();
  const plan = buildAppointmentReminderPlan([entry], 'student-a', true, at);
  assert.equal(dueAppointmentReminder(plan, at).hoursBefore, 0, 'Web session-start visible at start');
  assert.equal(dueAppointmentReminder(plan, at + 5 * 60000), undefined, 'Start notice expires');
  assert.ok(!plan.some(item => item.fireAt > at), 'Past start has no future trigger');
  console.log('PASS: native/web confirmation/dedupe/reload, three timed reminders and actual tracking, reschedule/cancel cleanup, disabled confirmation, permission fallback, test reminder, web session-start timing, unchanged booking documents. Mock Firebase/OS delivery.');
}
module.exports = { environment, appointment };
if (require.main === module) test().catch(error => { console.error(error); process.exitCode = 1; });
