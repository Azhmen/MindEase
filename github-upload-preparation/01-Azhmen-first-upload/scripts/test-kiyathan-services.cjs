// Actual TypeScript services, isolated in-memory Firestore boundary. Not deployed-rule tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
const rows = new Map(), cache = {};
let ids = 0, clock = 0, failCommit = false;
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
    exports, Error, __DEV__: false, require: id => id === 'firebase/firestore' ? api : id === '@/config/firebase' ? { db: {}, auth } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
async function test() {
  const management = load('services/counselor-management');
  const appointments = load('services/appointments');
  rows.set('users/student-a', { role: 'student' });
  rows.set('users/counselor-a', { role: 'counselor' });
  rows.set('users/counselor-b', { role: 'counselor' });
  rows.set('counselor_directory/counselor-a', { name: 'Counselor', active: true });
  auth.currentUser = { uid: 'counselor-a' };
  const input = { date: '2030-05-20', startTime: '10:30', endTime: '11:30', mode: 'virtual', location: '', isAvailable: true };
  for (const bad of [{ date: '2030-02-30' }, { endTime: '09:00' }, { startTime: '26:00' }, { mode: 'other' }, { mode: 'in_person', location: '  ' }]) await assert.rejects(management.createAvailabilitySlot({ ...input, ...bad }));
  const id = await management.createAvailabilitySlot({ ...input, counselorId: 'forged', extra: true });
  let slot = await management.getAvailabilitySlot(id);
  assert.equal(slot.counselorId, 'counselor-a'); assert.ok(!('extra' in slot));
  const created = slot.createdAt;
  await management.updateAvailabilitySlot(id, { ...input, mode: 'in_person', location: '  Campus room  ', isAvailable: false });
  slot = await management.getAvailabilitySlot(id);
  assert.equal(slot.location, 'Campus room'); assert.equal(slot.createdAt, created); assert.equal(slot.isAvailable, false);
  delete cache['services/counselor-management'];
  assert.equal((await load('services/counselor-management').getOwnAvailability()).length, 1, 'Reload persists own slots');
  auth.currentUser = { uid: 'counselor-b' };
  assert.equal((await management.getOwnAvailability()).length, 0);
  for (const fn of [() => management.getAvailabilitySlot(id), () => management.updateAvailabilitySlot(id, input), () => management.deleteAvailabilitySlot(id)]) await assert.rejects(fn(), /own/);
  auth.currentUser = { uid: 'student-a' };
  assert.equal((await management.getAvailableSlotsForBooking('counselor-a')).length, 0);
  await assert.rejects(management.createAvailabilitySlot(input), /counselor account/);
  auth.currentUser = { uid: 'counselor-a' };
  await management.updateAvailabilitySlot(id, input);
  await management.createAvailabilitySlot({ ...input, date: '2020-01-01' });
  auth.currentUser = { uid: 'student-a' };
  assert.equal((await management.getAvailableSlotsForBooking('counselor-a')).length, 1, 'Past/unavailable slots excluded');
  const schedule = { counselorId: 'counselor-a', appointmentDate: input.date, appointmentTime: input.startTime, sessionFormat: 'Virtual' };
  await management.assertAvailableBooking(schedule);
  await assert.rejects(management.assertAvailableBooking({ ...schedule, sessionFormat: 'In-Person' }), /no longer available/);
  await appointments.createAppointment('session-a', 'student-a', schedule, 'Private student note');
  const original = rows.get('appointments/session-a');
  const originalNote = rows.get('pre_session_notes/session-a');
  auth.currentUser = { uid: 'counselor-b' };
  assert.equal((await management.getCounselorSessions()).length, 0);
  for (const fn of [() => management.getCounselorSession('session-a'), () => management.getSessionPreSessionNote('session-a'), () => management.updateSessionStatus('session-a', 'completed')]) await assert.rejects(fn(), /assigned/);
  auth.currentUser = { uid: 'counselor-a' };
  assert.equal((await management.getCounselorSessions()).length, 1);
  assert.equal(await management.getSessionPreSessionNote('session-a'), 'Private student note');
  await assert.rejects(management.updateSessionStatus('session-a', 'rescheduled'), /supported/);
  await management.updateSessionStatus('session-a', 'completed');
  const completed = rows.get('appointments/session-a');
  for (const field of Object.keys(original).filter(key => !['status', 'updatedAt'].includes(key))) assert.equal(completed[field], original[field], 'Booking field preserved: ' + field);
  assert.equal(rows.get('pre_session_notes/session-a'), originalNote, 'Counselor does not mutate note');
  await assert.rejects(management.updateSessionStatus('session-a', 'cancelled'), /already/);
  await management.deleteAvailabilitySlot(id);
  assert.ok(!rows.has('counselor_availability/' + id)); assert.ok(rows.has('appointments/session-a'));
  auth.currentUser = { uid: 'student-a' };
  assert.equal((await appointments.getAppointment('session-a')).status, 'completed', 'Student reads counselor status');
  await assert.rejects(management.getCounselorSessions(), /counselor account/);
  await appointments.createAppointment('session-cancel', 'student-a', schedule);
  auth.currentUser = { uid: 'counselor-a' };
  assert.equal(await management.getSessionPreSessionNote('session-cancel'), null);
  await management.updateSessionStatus('session-cancel', 'cancelled');
  assert.equal(rows.get('appointments/session-cancel').status, 'cancelled');
  auth.currentUser = null;
  await assert.rejects(management.getOwnAvailability(), /sign in/);
  console.log('PASS: availability CRUD/validation/reload/ownership, published future-slot booking reads, assigned sessions and read-only notes, status-only updates reflected to student, closed-status protection.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
