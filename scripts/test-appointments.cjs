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
    exports, require: id => id === 'firebase/firestore' ? api : id === '@/config/firebase' ? { db: {}, auth } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
async function test() {
  const appointments = load('services/appointments'), notes = load('services/pre-session-notes');
  rows.set('users/student-a', { uid: 'student-a', role: 'student' });
  rows.set('users/student-b', { uid: 'student-b', role: 'student' });
  rows.set('users/counselor-a', { uid: 'counselor-a', role: 'counselor' });
  rows.set('counselor_directory/counselor-a', { name: ' Campus Counselor ', title: 'Campus Care', specialty: 'Student wellbeing', active: true });
  rows.set('counselor_directory/inactive', { name: 'Inactive', active: false });
  const schedule = { counselorId: 'counselor-a', appointmentDate: '2030-05-20', appointmentTime: '10:30', sessionFormat: 'Virtual' };
  assert.equal((await appointments.getBookingCounselors()).length, 1);
  for (const invalid of [{ appointmentDate: '2030-02-30' }, { appointmentTime: '27:00' }, { appointmentDate: '2020-01-01' }, { sessionFormat: 'Other' }]) {
    await assert.rejects(appointments.createAppointment('invalid', 'student-a', { ...schedule, ...invalid }));
    assert.ok(!rows.has('appointments/invalid'));
  }
  await assert.rejects(appointments.createAppointment('inactive', 'student-a', { ...schedule, counselorId: 'inactive' }), /unavailable/);
  failCommit = true;
  await assert.rejects(appointments.createAppointment('failed', 'student-a', schedule, 'Note'), /network/);
  assert.ok(!rows.has('appointments/failed') && !rows.has('pre_session_notes/failed'), 'Appointment/note save is atomic');
  const id = appointments.newAppointmentId();
  await appointments.createAppointment(id, 'student-a', { ...schedule, topics: ['Must not leak'], ownerUid: 'Must not leak', note: 'Must not leak' }, '  Topics: Exam Stress\n\nMy note  ');
  const first = await appointments.getAppointment(id);
  assert.equal(first.status, 'booked'); assert.equal(first.studentId, 'student-a');
  assert.ok(!('topics' in first) && !('ownerUid' in first) && !('note' in first));
  assert.equal((await notes.getPreSessionNote(id)).note, 'Topics: Exam Stress\n\nMy note');
  const size = rows.size;
  await appointments.createAppointment(id, 'student-a', schedule, 'Retry should not overwrite');
  assert.equal(rows.size, size); assert.equal((await appointments.getAppointment(id)).createdAt, first.createdAt);
  assert.equal((await notes.getPreSessionNote(id)).note, 'Topics: Exam Stress\n\nMy note');
  await assert.rejects(notes.createPreSessionNote(id, 'Duplicate'), /already exists/);
  await assert.rejects(notes.updatePreSessionNote(id, '   '), /Enter a note/);
  await assert.rejects(notes.updatePreSessionNote(id, 'a'.repeat(2001)), /2,000/);
  await notes.updatePreSessionNote(id, '  Changed note  ');
  assert.equal((await notes.getPreSessionNote(id)).note, 'Changed note');
  await appointments.updateAppointment(id, { ...schedule, appointmentDate: '2030-05-21', sessionFormat: 'In-Person', studentId: 'forged' });
  const rescheduled = await appointments.getAppointment(id);
  assert.equal(rescheduled.status, 'rescheduled'); assert.equal(rescheduled.studentId, 'student-a');
  assert.equal(rescheduled.createdAt, first.createdAt); assert.equal(rescheduled.appointmentDate, '2030-05-21');
  delete cache['services/appointments']; delete cache['services/pre-session-notes'];
  assert.equal((await load('services/appointments').getAppointmentsForStudent())[0].id, id, 'Reloaded services read persisted data');
  auth.currentUser = { uid: 'student-b' };
  assert.equal((await appointments.getAppointmentsForStudent()).length, 0);
  for (const operation of [
    () => appointments.getAppointment(id), () => appointments.updateAppointment(id, schedule), () => appointments.cancelAppointment(id),
    () => notes.getPreSessionNote(id), () => notes.createPreSessionNote(id, 'Foreign'), () => notes.updatePreSessionNote(id, 'Foreign'), () => notes.deletePreSessionNote(id),
  ]) await assert.rejects(operation(), /own/);
  await assert.rejects(appointments.createAppointment('wrong-owner', 'student-a', schedule), /previous session/);
  auth.currentUser = { uid: 'counselor-a' };
  await assert.rejects(appointments.getAppointmentsForStudent(), /student account/);
  auth.currentUser = { uid: 'guest-a', isAnonymous: true };
  await assert.rejects(appointments.getAppointmentsForStudent(), /student account/);
  auth.currentUser = { uid: 'student-a' };
  await appointments.cancelAppointment(id);
  assert.equal((await appointments.getAppointment(id)).status, 'cancelled');
  assert.ok(rows.has('appointments/' + id), 'Cancel is a soft delete');
  assert.equal((await notes.getPreSessionNote(id)).note, 'Changed note', 'Cancellation preserves notes');
  await assert.rejects(appointments.updateAppointment(id, schedule), /Cancelled/);
  await notes.deletePreSessionNote(id);
  assert.equal(await notes.getPreSessionNote(id), null);
  await notes.createPreSessionNote(id, 'Recreated own note');
  assert.equal((await notes.getPreSessionNote(id)).note, 'Recreated own note');
  const emptyId = appointments.newAppointmentId();
  await appointments.createAppointment(emptyId, 'student-a', { ...schedule, appointmentDate: '2030-05-19' });
  assert.equal(await notes.getPreSessionNote(emptyId), null, 'Optional note creates no empty document');
  assert.equal((await appointments.getAppointmentsForStudent())[0].id, emptyId, 'Upcoming bookings precede cancelled bookings');
  auth.currentUser = null;
  await assert.rejects(appointments.getAppointmentsForStudent(), /sign in/);
  console.log('PASS: appointment create/read/reschedule/soft cancellation; atomic optional note; retry idempotency; note create/read/update/delete; validation; account isolation; reload persistence; student role enforcement.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
