// Actual booking handler, status card and banner; Firebase/OS/widgets are isolated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { environment, appointment } = require('./test-appointment-notifications.cjs');

async function test() {
  const env = environment(false), service = env.load('services/appointment-reminders');
  const draft = { ...appointment(48), id: 'booking', ownerUid: 'student-a', counselorId: 'counselor-a', counselorName: 'Campus Counselor', sessionFormat: 'Virtual', topics: [], note: '' };
  env.rows.set('users/student-a', { role: 'student', appointmentRemindersEnabled: true });
  env.rows.set('counselor_directory/counselor-a', { name: 'Campus Counselor', active: true });
  let context, route, state = [], index = 0, development = true, denyBooking = false;
  service.subscribeAppointmentReminderState('student-a', value => { context = { ...value, now: Date.now() }; });
  const widget = props => React.createElement('Widget', props, props.children);
  const hooks = { ...React,
    useState: initial => { const key = index++; if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial; return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }]; },
    useRef: value => { const key = index++; if (!(key in state)) state[key] = { current: value }; return state[key]; },
    useContext: () => context,
  };
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components', name + '.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
      exports, console, __DEV__: development, require: id => {
        if (id === 'react') return hooks;
        if (id === '@/hooks/use-temporary-feedback') return { SUCCESS_MESSAGE_DURATION: 3000 };
        if (id === 'react-native') return { Platform: { OS: 'web' }, View: 'View' };
        if (id === 'expo-router') return { useRouter: () => ({ replace: value => { route = value; }, push: value => { route = value; } }), useFocusEffect: () => {}, useLocalSearchParams: () => ({ id: 'booking' }) };
        if (id === '@/components/booking-draft') return { useBookingDraft: () => ({ draft, reset() {} }) };
        if (id === '@/components/appointment-reminder-status') return load('appointment-reminder-status');
        if (id === '@/components/appointment-reminder-banner') return load('appointment-reminder-banner');
        if (id === '@/components/presentation') return { FormPanel: widget, StepRail: widget, presentation: {} };
        if (id === '@/components/appointment-ui') return { AppointmentSummary: widget, Choice: widget, SchedulePicker: widget, TopicsPicker: widget, appointmentStyles: {} };
        if (id === '@/components/student-ui') return { CareButton: widget, StudentCard: widget, studentStyles: {} };
        if (id === '@/components/student-screen') return { StudentScreen: widget, StatusMessage: widget, LoadingState: widget };
        if (id === '@/components/text') return { AppText: widget };
        if (id === '@/components/app-text-input') return { AppTextInput: widget };
        if (id === '@/components/care-icon') return { CareIcon: widget };
        if (id === '@/constants/colors') return { Colors: {} };
        if (id === '@/utils/auth') return { getAuthErrorMessage: error => error.message };
        if (id === '@/services/counselor-management') return { assertAvailableBooking: async () => {} };
        if (id === '@/services/appointments') return { ...env.load('services/appointments'), createAppointment: (...args) => { if (denyBooking) throw new Error('Booking denied'); return env.load('services/appointments').createAppointment(...args); } };
        if (id === '@/services/pre-session-notes') return {};
        if (id.startsWith('@/')) return env.load(id.slice(2));
        return require(id);
      },
    });
    return cache[name] = exports;
  }
  const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
  const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.props?.children) : String(tree ?? '');
  function render(Component, props) { index = 0; return Component(props); }
  const Confirm = load('appointment-screens').ConfirmAppointmentScreen;
  let tree = render(Confirm);
  const button = nodes(tree).find(node => node.props?.title === 'Confirm Appointment' && node.props?.onPress);
  await Promise.all([button.props.onPress(), button.props.onPress()]);
  assert.equal(route.pathname, '/student/appointments/success');
  assert.equal(context.event.title, 'Appointment Confirmed');
  assert.equal(context.statuses.booking.confirmationSent, true);
  const Banner = load('appointment-reminder-banner').AppointmentReminderBanner;
  assert.ok(text(render(Banner)).includes('Appointment Confirmed'));
  context.now = context.event.at + 3000;
  assert.ok(!text(render(Banner)).includes('Appointment Confirmed'), 'Booking feedback expires at three seconds');
  context.now = Date.now();
  const Status = load('appointment-reminder-status').AppointmentReminderStatus;
  const entry = await env.load('services/appointments').getAppointment('booking');
  state = []; tree = render(Status, { entry });
  assert.ok(text(tree).includes('Booking confirmation:  Shown in-app'));
  assert.ok(text(tree).includes('Planned in-app'));
  assert.ok(text(tree).includes('Background web push is not implemented'));
  assert.ok(nodes(tree).some(node => node.props?.title === 'Send test reminder'));
  env.rows.get('users/student-a').appointmentRemindersEnabled = false;
  await service.scheduleAppointmentReminders([entry], false, 'student-a');
  assert.ok(text(render(Status, { entry })).includes('Appointment reminders: Disabled'));
  assert.ok(!text(render(Status, { entry })).includes('Planned in-app'));
  development = false; delete cache['appointment-reminder-status']; state = [];
  assert.ok(!nodes(render(load('appointment-reminder-status').AppointmentReminderStatus, { entry })).some(node => node.props?.title === 'Send test reminder'));
  const production = environment(true, false);
  await production.load('services/appointment-reminders').sendTestAppointmentReminder('booking');
  assert.equal(production.immediate.length, 0, 'Test helper also guarded in service');
  context = { ...context, event: null, now: Date.now() };
  const at = context.now;
  context.plan = [{ id: 'start', appointmentId: 'booking', appointmentAt: at, fireAt: at, hoursBefore: 0 }];
  assert.ok(text(render(Banner)).includes('Your Session Is Starting'));
  context = { ...context, plan: [], event: null, error: 'Reminder unavailable' };
  assert.equal(render(Banner), null, 'No reminder card without a relevant notice');
  context.event = { title: 'Appointment Cancelled', body: 'Cancelled', appointmentId: 'booking', at: context.now };
  assert.equal(render(Banner), null, 'Cancellation does not show an upcoming reminder');
  context.event = null;
  context.plan = [{ id: 'past', appointmentId: 'booking', appointmentAt: at - 5 * 60000, fireAt: at - 5 * 60000, hoursBefore: 0 }];
  assert.equal(render(Banner), null, 'Session-start card expires after its existing five-minute window');
  context.plan = [{ id: 'hour', appointmentId: 'booking', appointmentAt: at + 30 * 60000, fireAt: at - 30 * 60000, hoursBefore: 1 }];
  assert.ok(text(render(Banner)).includes('Appointment reminder'), 'Relevant upcoming reminder is visible');
  state = []; denyBooking = true; route = null; context.event = null;
  tree = render(Confirm); await nodes(tree).find(node => node.props?.title === 'Confirm Appointment' && node.props?.onPress).props.onPress();
  assert.equal(route, null); assert.equal(context.event, null, 'Failed CRUD does not notify');
  console.log('PASS: actual confirm handler/double press, in-app banner, truthful tracking/disabled UI, production helper exclusion, session-start banner, failed booking has no confirmation.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
