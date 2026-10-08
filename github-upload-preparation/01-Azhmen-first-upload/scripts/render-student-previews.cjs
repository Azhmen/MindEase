// Isolated visual fixtures rendered from actual components. No Firebase or auth bypass in the app.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const RN = require('react-native-web');
const ts = require('typescript');
const iconFont = fs.readFileSync(require.resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf')).toString('base64');
const output = path.join(__dirname, '..', 'artifacts', 'student-previews');
fs.mkdirSync(output, { recursive: true });
const timestamp = { toDate: () => new Date('2026-10-05T09:20:00+05:30'), toMillis: () => 1000, seconds: 1, nanoseconds: 0 };
const chatFixture = { id: 'student-fixture-thread', studentId: 'student-fixture', counselorId: 'fixture', lastMessage: 'A question about exam stress.', createdAt: timestamp, lastMessageAt: timestamp };
const guestFixture = { id: 'private-session-id', anonymous: true, anonymousUid: 'private-guest-uid', counselorId: 'fixture', lastMessage: 'Hello anonymously', createdAt: timestamp, lastMessageAt: { ...timestamp, toMillis: () => 3000 } };
const mood = { id: 'sample', userId: 'fixture', mood: 'Good', moodScore: 4, note: 'A quiet walk helped me reset today.', createdAt: timestamp, updatedAt: timestamp };
const profile = { uid: 'fixture', role: 'student', name: 'Maya Perera', email: 'student@example.test' };
const reflection = { id: 'sample', userId: 'fixture', moodEntryId: 'sample', reflection: 'I can see how a short walk helped.', createdAt: timestamp, updatedAt: timestamp };
const resource = { id: 'sample', title: 'A gentle stress reset', description: 'Make a little space when your day feels busy.', category: 'Academic Stress', featured: true, duration: '2 min', type: 'Practice', active: true, summary: 'Pause and let your shoulders relax. Choose one small task.' };
const savedResource = { id: 'fixture_sample', userId: 'fixture', resourceId: 'sample', savedAt: timestamp, favorite: false, personalNote: 'This helped me pause.', updatedAt: timestamp };
const booking = { id: 'sample', ownerUid: 'fixture', studentId: 'fixture', counselorId: 'counselor-fixture', counselorName: 'Campus Counselor', appointmentDate: '2030-05-20', appointmentTime: '10:30', sessionFormat: 'Virtual', status: 'booked', topics: ['Sleep Difficulties'], note: 'I would like support with my sleep.', createdAt: timestamp, updatedAt: timestamp };
const today = (() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); })();
const slot = { id: 'slot', counselorId: booking.counselorId, date: booking.appointmentDate, startTime: '10:30', endTime: '11:30', mode: 'virtual', location: '', isAvailable: true };
const counselorProfile = { uid: 'counselor-fixture', role: 'counselor', name: 'Updated Counselor', email: 'counselor@example.test', title: 'Updated Professional Title', specialization: 'Academic wellbeing', bio: 'A short original bio.', officeLocation: 'Office A', phoneExtension: '204' };
const messages = [
  { id: 'sample-message', senderId: 'fixture', senderRole: 'student', text: 'I am feeling overwhelmed about my exams.', createdAt: timestamp },
  { id: 'sample-reply', senderId: 'counselor-fixture', senderRole: 'counselor', text: 'Thank you for reaching out. What has been weighing on you most today?', createdAt: timestamp },
];
let pathname = '', overrides = {}, cache = {};
function load(relativePath) {
  if (cache[relativePath]) return cache[relativePath];
  let file = path.join(__dirname, '..', 'src', relativePath + '.tsx');
  if (!fs.existsSync(file)) file = file.replace(/tsx$/, 'ts');
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let stateIndex = 0;
  const exports = {};
  const router = { push: () => {}, replace: () => {} };
  vm.runInNewContext(code, { exports, __DEV__: false, require: id => {
    if (id === 'react') return { ...React, useState: initial => React.useState(overrides[relativePath]?.[stateIndex++] ?? initial) };
    if (id === 'react-native') return RN;
    if (id === 'react-native-safe-area-context') return { SafeAreaView: RN.View };
    if (id === 'expo-image') return { Image: RN.Image };
    if (id === '@expo/vector-icons/Ionicons') return { __esModule: true, default: props => React.createElement(RN.Text, { style: { fontFamily: 'IoniconsPreview', fontSize: props.size, lineHeight: props.size, color: props.color }, accessibilityLabel: props.name }, String.fromCodePoint(require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json')[props.name] ?? 0)) };

    if (id === 'expo-router') return { useRouter: () => router, useNavigation: () => ({ addListener: () => () => {} }), usePathname: () => pathname, useLocalSearchParams: () => ({ id: 'sample' }), useFocusEffect: () => {} };
    if (id === '@/services/mood') return { MOODS: ['Great', 'Good', 'Okay', 'Low', 'Very Low'] };
    if (id === '@/services/auth') return { getCurrentUser: () => ({ uid: 'fixture' }), logoutUser: async () => {} };
    if (id === '@/components/booking-draft') return { useBookingDraft: () => ({ draft: booking, setDraft: () => {}, reset: () => {} }) };
    if (id === '@/services/user-profile') return { STUDENT_PROFILE_LIMITS: { name: 100, preferredName: 100, faculty: 120, yearOfStudy: 1 }, COUNSELOR_PROFILE_LIMITS: { name: 100, title: 100, specialization: 160, bio: 1000, officeLocation: 200, phoneExtension: 30 } };
    if (id === '@/services/appointments') return { appointmentStart: entry => new Date(entry.appointmentDate + 'T' + entry.appointmentTime + ':00') };
    if (id === '@/services/appointment-reminders') return { emptyReminderSnapshot: { uid: '', plan: [], enabled: null, delivery: 'in-app', statuses: {}, event: null, error: '' } };
    if (id.startsWith('@/services/')) return {};
    if (id === '@/utils/auth') return { getAuthErrorMessage: error => String(error) };
    if (id.startsWith('@/')) return load(id.slice(2));
    if (id.startsWith('./')) return load(path.posix.join(path.posix.dirname(relativePath), id));
    return require(id);
  } });
  cache[relativePath] = exports;
  return exports;
}
const fixtures = [
  ['support', 'app/counselor/support', {}],
  ['login', 'app/login', {}],
  ['register', 'app/register', {}],
  ['appointments', 'app/student/(booking)/appointments', { 'components/appointment-screens': [[booking], false, '', '', 0, Date.now(), false, ''] }],
  ['appointmentempty', 'app/student/(booking)/appointments', { 'components/appointment-screens': [[], false, '', '', 0, Date.now(), false, ''] }],
  ['appointmentcancelled', 'app/student/(booking)/appointments', { 'components/appointment-screens': [[{ ...booking, status: 'cancelled' }], false, '', '', 0, Date.now(), false, ''] }],
  ['appointmentbook', 'app/student/(booking)/appointments/book', { 'components/appointment-screens': [[{ id: 'counselor-fixture', name: 'Campus Counselor', title: 'Campus Care', specialty: 'Student wellbeing' }], false, '', 0, ''] }],
  ['appointmentnocounselors', 'app/student/(booking)/appointments/book', { 'components/appointment-screens': [[], false, '', 0, ''] }],
  ['appointmenterror', 'app/student/(booking)/appointments/book', { 'components/appointment-screens': [[], false, 'Firebase denied access.', 0, ''] }],
  ['appointmentnote', 'app/student/(booking)/appointments/pre-session', {}],
  ['appointmentconfirm', 'app/student/(booking)/appointments/confirm', {}],
  ['appointmentsuccess', 'app/student/(booking)/appointments/success', { 'components/appointment-screens': [booking, false, '', 0] }],
  ['appointmentedit', 'app/student/(booking)/appointments/edit/[id]', { 'components/appointment-screens': [booking, false, '', 0, false, '', Date.now(), booking, { id: 'sample', appointmentId: 'sample', studentId: 'fixture', note: booking.note }, booking.note, false, '', '', 0, false, false, false, ''] }],
  ['home', 'app/student/home', { 'app/student/home': ['Maya', mood, false, '', 0] }],
  ['mood', 'app/student/mood/index', { 'components/mood-form': ['Good', 'A quiet walk helped me reset today.', [], false, ''] }],
  ['history', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [], false, '', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['historymenu', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [], false, '', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30')], 'components/mood-log-card': [true] }],
  ['historymultiple', 'app/student/mood/history', { 'app/student/mood/history': [[mood, { ...mood, id: 'second', mood: 'Very Low', note: '' }], false, '', 0, [reflection], false, '', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30')] }],
  ['historyreflection', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [reflection], false, '', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['historymonth', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [], false, '', 0, 'Month', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['historyalltime', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [], false, '', 0, 'All Time', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['historyempty', 'app/student/mood/history', { 'app/student/mood/history': [[], false, '', 0, [], false, '', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['historyreflectionerror', 'app/student/mood/history', { 'app/student/mood/history': [[mood], false, '', 0, [], false, 'Firebase denied reflection access.', 0, 'This Week', new Date('2026-10-07T14:00:00+05:30'), null] }],
  ['edit', 'app/student/mood/edit/[id]', { 'app/student/mood/edit/[id]': [mood, false, '', 0] }],
  ['chat', 'app/student/chat', { 'components/student-live-support': [{ id: 'fixture', studentId: 'fixture', counselorId: 'counselor-fixture' }, [], false, false, false, false, '', 0], 'components/live-chat-screen': [messages, 'Campus Counselor', 'Active counselor Â· Campus Care', '', null, null, false, false, '', '', 0] }],
  ['crisis', 'app/student/crisis-support', {}],
  ['resources', 'app/student/resources', { 'components/resource-screens': [[resource], [], 'starter', false, '', 0, 'All'] }],
  ['resourcessearch', 'app/student/resources', { 'components/resource-screens': [[resource], [], 'starter', false, '', 0, 'All', 'no-match-phrase'] }],
  ['resourcescategory', 'app/student/resources', { 'components/resource-screens': [[resource], [], 'starter', false, '', 0, 'Sleep', ''] }],
  ['resourcesempty', 'app/student/resources', { 'components/resource-screens': [[], [], 'firestore', false, '', 0, 'All'] }],
  ['resourceserror', 'app/student/resources', { 'components/resource-screens': [[], [], 'firestore', false, 'Firebase denied resource access.', 0, 'All'] }],
  ['resourcedetail', 'app/student/resources/[id]', { 'components/resource-screens': [resource, false, false, '', 0] }],
  ['resourcesaved', 'app/student/resources/saved', { 'components/resource-screens': ['', [{ saved: savedResource, resource }], false, '', 0, false, '', false] }],
  ['resourcefavorite', 'app/student/resources/saved', { 'components/resource-screens': ['', [{ saved: { ...savedResource, favorite: true }, resource }], false, '', 0, false, '', false] }],
  ['resourcenoteedit', 'app/student/resources/saved', { 'components/resource-screens': ['', [{ saved: savedResource, resource }], false, '', 0, true, savedResource.personalNote, false] }],
  ['resourceremove', 'app/student/resources/saved', { 'components/resource-screens': ['', [{ saved: savedResource, resource }], false, '', 0, false, ''], 'components/gihani-ui': [true, '', ''] }],
  ['resourcesavedempty', 'app/student/resources/saved', { 'components/resource-screens': ['', [], false, '', 0] }],
  ['profile', 'app/student/profile', { 'app/student/profile': [profile, {}, false, false, false, '', '', 0] }],
  ['studentprofileedit', 'app/student/profile', { 'app/student/profile': [profile, { name: profile.name, faculty: 'Computing', yearOfStudy: '3' }, false, true, false, '', '', 0] }],
  ['studentsupport', 'app/student/support', {}],
  ['studentsupportfaq', 'app/student/support', { 'app/student/support': ['', '', 'faq'] }],
  ['studentsupportguide', 'app/student/support', { 'app/student/support': ['', '', 'guide'] }],
  ['studentprivacy', 'app/student/privacy', {}],
  ['anonymoushome', 'app/anonymous/home', { 'app/anonymous/home': [mood, false, '', 0] }],
  ['anonymousmood', 'app/anonymous/mood', { 'components/mood-form': ['Good', '', [], false, ''] }],
  ['anonymoushistory', 'app/anonymous/mood/history', { 'app/anonymous/mood/history': [[mood], false, '', '', null, false, 0] }],
  ['anonymousedit', 'app/anonymous/mood/edit/[id]', { 'app/anonymous/mood/edit/[id]': [mood, false, '', 0] }],
  ['anonymouschat', 'app/anonymous/chat', { 'components/student-live-support': [{ id: 'guest-thread', anonymous: true, counselorId: 'counselor-fixture' }, [], false, false, false, false, '', 0], 'components/live-chat-screen': [messages, 'Campus Counselor', 'Active counselor Â· Campus Care', '', null, null, false, false, '', '', 0] }],
  ['anonymouscrisis', 'app/anonymous/crisis-support', {}],
  ['counselorinbox', 'app/counselor/chats', { 'hooks/use-counselor-threads': [[], [guestFixture], false, '', 0] }],
  ['counselorzero', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Anika Jayasinghe', false, '', 0], 'hooks/use-counselor-threads': [[], [], false, '', 0] }],
  ['counselorone', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Anika Jayasinghe', false, '', 0], 'hooks/use-counselor-threads': [[chatFixture], [], false, '', 0] }],
  ['counselormany', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Anika Jayasinghe', false, '', 0], 'hooks/use-counselor-threads': [[{ ...chatFixture, lastMessageAt: { ...timestamp, toMillis: () => 2000 } }, { ...chatFixture, id: 'old-thread', lastMessage: 'OLDER_PREVIEW_NOT_ON_DASHBOARD', lastMessageAt: { ...timestamp, toMillis: () => 500 } }], [guestFixture, { ...guestFixture, id: 'other-private-session', lastMessage: 'A second anonymous conversation.', lastMessageAt: { ...timestamp, toMillis: () => 1500 } }], false, '', 0] }],
  ['counselorloading', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['', true, '', 0] }],
  ['counselorerror', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['', false, '', 0], 'hooks/use-counselor-threads': [[], [], false, 'Fixture: Firebase denied access.', 0] }],
  ['availability', 'app/counselor/availability', { 'components/counselor-management-screens': [[slot], false, '', 0, false, '', ''] }],
  ['availabilityempty', 'app/counselor/availability', { 'components/counselor-management-screens': [[], false, '', 0, false, '', ''] }],
  ['availabilitydelete', 'app/counselor/availability', { 'components/counselor-management-screens': [[slot], false, '', 0, false, '', 'slot'] }],
  ['availabilitynew', 'app/counselor/availability/new', {}],
  ['availabilityedit', 'app/counselor/availability/edit/[id]', { 'components/counselor-management-screens': [slot, false, '', 0, false, '', slot] }],
  ['sessions', 'app/counselor/sessions', { 'components/counselor-management-screens': [[booking, { ...booking, id: 'closed', status: 'completed' }], false, '', 0] }],
  ['sessiondetails', 'app/counselor/session/[id]', { 'components/counselor-management-screens': [{ session: booking, note: booking.note }, false, '', 0, false, '', null, ''] }],
  ['sessionclosed', 'app/counselor/session/[id]', { 'components/counselor-management-screens': [{ session: { ...booking, status: 'completed' }, note: null }, false, '', 0, false, '', null, ''] }],
  ['sessionerror', 'app/counselor/session/[id]', { 'components/counselor-management-screens': [null, false, 'Only assigned sessions are accessible.', 0, false, '', null, ''] }],
  ['counselorsessions', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Anika', false, '', 0], 'hooks/use-counselor-schedule': [[{ ...booking, appointmentDate: today }], [slot], false, '', 0], 'hooks/use-counselor-threads': [[], [], false, '', 0] }],
  ['counselorseveralsessions', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Anika', false, '', 0], 'hooks/use-counselor-schedule': [[{ ...booking, appointmentDate: today }, { ...booking, id: 'second', appointmentDate: today, sessionFormat: 'In-Person' }, { ...booking, id: 'third', appointmentDate: today, status: 'completed' }], [slot], false, '', 0], 'hooks/use-counselor-threads': [[], [], false, '', 0] }],
  ['counselorprofile', 'app/counselor/profile', { 'app/counselor/profile': [counselorProfile, counselorProfile, false, false, false, '', '', 0] }],
  ['counselorprofileedit', 'app/counselor/profile', { 'app/counselor/profile': [counselorProfile, counselorProfile, false, true, false, '', '', 0] }],
  ['counselorprofiledashboard', 'app/counselor/dashboard', { 'app/counselor/dashboard': ['Updated Counselor', false, '', 0, 'Updated Professional Title'], 'hooks/use-counselor-threads': [[], [], false, '', 0] }],
  ['counselorcrisis', 'app/counselor/crisis-support', {}],
];
const manifest = [];
for (const [name, route, values] of fixtures.filter(fixture => !process.argv.includes('--mood-rhythm') || fixture[1] === 'app/student/mood/history')) {
  cache = {}; overrides = { 'hooks/use-counselor-schedule': [[], [], false, '', 0], 'components/appointment-ui': [[slot], false, '', 0], ...values }; pathname = '/' + route.replace(/^app\//, '').replace(/\/index$/, '');
  const Screen = load(route).default;
  RN.AppRegistry.registerComponent('MindEaseFixture', () => Screen);
  const application = RN.AppRegistry.getApplication('MindEaseFixture');
  const body = renderToStaticMarkup(application.element);
  if (route === 'app/student/mood/history') {
    for (const label of ['Mood Rhythm', 'This Week', 'Month', 'All Time', 'Weekly Balance', 'Recent Logs']) assert.ok(body.includes(label), label);
    assert.ok(!body.includes('Your check-in timeline') && !body.includes('Manage original check-in'));
    assert.ok(body.includes('Home') && body.includes('Mood') && body.includes('Resources') && body.includes('Profile'));
    if (name !== 'historyempty') assert.ok(body.includes(mood.note));
    if (name === 'history') assert.ok(body.includes('No reflection yet') && body.includes('+ Add reflection'));
    if (name === 'historymenu') assert.ok(body.includes('Edit check-in') && body.includes('Delete check-in'));
    if (name === 'historymultiple') assert.ok(body.includes('Very Low') && body.includes(reflection.reflection) && body.includes('No reflection yet'));

    if (name === 'historyreflection') assert.ok(body.includes(reflection.reflection) && body.includes('Edit reflection') && body.includes('Delete reflection'));
    if (name === 'historyempty') assert.ok(body.includes('No check-ins in this range yet.'));
    if (name === 'historyreflectionerror') assert.ok(body.includes('Retry Reflections') && body.includes('Firebase denied reflection access.'));
  }
  if (route.startsWith('app/student/resources')) {
    assert.ok(body.includes('Home') && body.includes('Mood') && body.includes('Resources') && body.includes('Profile'));
    if (name === 'resources') assert.ok(body.includes(resource.title) && body.includes('Save') && body.includes('Original starter wellbeing library') && body.includes('Search resources') && body.includes('Featured Resources'));
    if (['resourcessearch', 'resourcescategory'].includes(name)) { assert.ok(body.includes('No resources here yet')); assert.ok(!body.includes(resource.title)); }
    if (name === 'resourcesempty') assert.ok(body.includes('No resources here yet'));
    if (name === 'resourceserror') assert.ok(body.includes('Firebase denied resource access.'));
    if (name === 'resourcedetail') assert.ok(body.includes(resource.summary) && body.includes('Save Resource'));
    if (name === 'resourcesaved') assert.ok(body.includes(savedResource.personalNote) && body.includes('Add to Favorites') && body.includes('Remove from Saved'));
    if (name === 'resourcefavorite') assert.ok(body.includes('Favorite') && body.includes('Remove Favorite'));
    if (name === 'resourcenoteedit') assert.ok(body.includes('Your personal note') && body.includes('Save Note'));
    if (name === 'resourceremove') assert.ok(body.includes('Removing...'));
    if (name === 'resourcesavedempty') assert.ok(body.includes('No saved resources yet'));
  }
  if (route.startsWith('app/student/(booking)/appointments')) {
    assert.ok(body.includes('Home') && body.includes('Mood') && body.includes('Resources') && body.includes('Profile'));
    if (['appointmentbook', 'appointmentedit', 'appointmentconfirm'].includes(name)) assert.ok(body.includes('counselor availability')); assert.ok(!body.includes('Demo time'));
    if (name === 'appointmentconfirm') assert.ok(body.includes('Sleep Difficulties') && body.includes(booking.note) && body.includes('Confirm Appointment'));
    if (name === 'appointmentempty') assert.ok(body.includes('No appointments yet'));
    if (name === 'appointmentcancelled') assert.ok(!body.includes('Cancel Appointment'));
    if (name === 'appointmentedit') assert.ok(body.includes('Save Reschedule') && body.includes('Edit Note') && body.includes(booking.note));
    if (name === 'appointmentnocounselors') assert.ok(body.includes('No active counselors'));
    if (name === 'appointmenterror') assert.ok(body.includes('Firebase denied access.'));
  }
  if (route.startsWith('app/anonymous/')) {
    assert.ok(!body.includes('Open profile'), 'Guest screens must not expose Profile');
    assert.ok(!body.includes('Maya Perera') && !body.includes('student@example.test'), 'Guest screens must not expose account details');
  }
  if (name === 'counselorinbox') {
    assert.ok(body.includes('Anonymous Student'));
    assert.ok(!body.includes('private-guest-uid') && !body.includes('private-session-id'));
  }
  if (route === 'app/counselor/dashboard') {
    if (!['counselorsessions', 'counselorseveralsessions'].includes(name)) assert.ok(body.includes('No sessions scheduled.')); else assert.ok(body.includes('Student session') && body.includes('View Session'));
    assert.ok(body.includes('Live Student Chats') && body.includes('Quick Actions'));
    assert.ok(body.includes('Schedule') && body.includes('Profile') && body.includes('Messages') && body.includes('Home'));
    assert.ok(!body.includes('private-guest-uid') && !body.includes('private-session-id'));
    if (name === 'counselormany') { assert.ok(body.includes('Anonymous Student')); assert.ok(!body.includes('OLDER_PREVIEW_NOT_ON_DASHBOARD')); assert.ok(!body.includes('A second anonymous conversation.')); }
    if (name === 'counselorseveralsessions') assert.equal((body.match(/View Session/g) || []).length, 3);
    const plain = body.replace(/<[^>]*>/g, '');
    if (name === 'counselorzero') assert.ok(plain.includes('0assigned conversations'));
    if (name === 'counselorone') assert.ok(plain.includes('1assigned conversation'));
    if (name === 'counselormany') assert.ok(plain.includes('4assigned conversations'));
    if (['counselorzero', 'counselorone', 'counselormany'].includes(name)) assert.ok(body.includes('Counselor Anika Jayasinghe'));
  }
  if (name === 'availability') assert.ok(body.includes('10:30') && body.includes('11:30') && body.includes('Edit') && body.includes('Delete'));
  if (name === 'availabilityempty') assert.ok(body.includes('No availability slots yet.'));
  if (name === 'availabilitydelete') assert.ok(body.includes('Delete this availability slot?'));
  if (name === 'availabilitynew') assert.ok(body.includes('Create Slot') && body.includes('Available for booking'));
  if (name === 'availabilityedit') assert.ok(body.includes('Save Changes'));
  if (name === 'sessiondetails') assert.ok(body.includes(booking.note) && body.includes('read only') && body.includes('Mark Completed') && !body.includes('Edit Note'));
  if (name === 'sessionclosed') assert.ok(body.includes('This session is closed.') && !body.includes('Mark Completed'));
  if (name === 'sessionerror') assert.ok(body.includes('Only assigned sessions are accessible.'));
  if (name === 'counselorprofile') assert.ok(body.includes(counselorProfile.name) && body.includes(counselorProfile.email) && body.includes('Edit Profile') && body.includes('Open Support Options') && !body.includes('Coming soon'));
  if (name === 'counselorprofileedit') assert.ok(body.includes('Save Changes') && body.includes('Cancel') && body.includes('Short Bio'));
  if (name === 'counselorprofiledashboard') assert.ok(body.includes('Updated Professional Title'));
  manifest.push({ name, route: '/' + route.replace(/^app\//, '').replace(/\/index$/, '') });
  const style = renderToStaticMarkup(application.getStyleElement());
  fs.writeFileSync(path.join(output, name + '.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MindEase fixture: ' + name + '</title>' + style + '<style>@font-face{font-family:IoniconsPreview;src:url(data:font/ttf;base64,' + iconFont + ')}html,body,#root{height:100%;margin:0}#root{display:flex}body{background:#F3F4F1}</style></head><body><div id="root">' + body + '</div></body></html>');
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(process.argv.includes('--mood-rhythm') ? 'PASS: actual MoodHistoryRoute rendered in weekly/month/all-time, empty, reflected and reflection-error states; old timeline absent: ' + output : 'Rendered student/guest/counselor fixtures; verified mood reflections, resource browsing/detail/saved/edit/remove/empty/error states, appointment flow, dashboard chat states and anonymous privacy: ' + output);
if (process.argv.includes('--serve')) {
  http.createServer((request, response) => {
    const name = (request.url ?? '').split('?')[0].replace(/^\//, '') || 'home.html';
    if (!/^[a-z]+\.html$/.test(name)) { response.writeHead(404); response.end(); return; }
    const file = path.join(output, name);
    if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(fs.readFileSync(file));
  }).listen(8090, '127.0.0.1', () => console.log('Visual fixtures: http://127.0.0.1:8090/home.html'));
}
