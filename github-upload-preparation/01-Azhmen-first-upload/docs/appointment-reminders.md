# Appointment reminder support

Tharukanan retains appointment/pre-session note CRUD. No booking schema or collection was changed. A student-layout provider observes the authenticated student's appointments and their own `users/{uid}` setting in real time. Confirmed creates, idempotent retries, reschedules, cancellations and counselor terminal-status changes reconcile the same reminder plan. Cancelled/completed appointments have no pending plan. Past native triggers are never scheduled; web session-start notices have a five-minute display window.

## Preference and metadata

`users.appointmentRemindersEnabled` is an optional boolean. Missing means **disabled** (opt-in). Student Profile loads it and writes only this setting plus updatedAt; registration, UID, email, role and createdAt are unchanged. The existing **firestore.rules** already permit this owner-only, student-only setting. This notification extension changes no rules and requires no rules republishing; an older Firebase deployment still needs the existing rules. No other collection grants changed.

Device metadata is stored in AsyncStorage under `mindease_appointment_reminders:{uid}`: stable reminder ID, appointment ID, appointment start epoch, reminder epoch and offset (24, 1, or 0 hours). No new Firestore collection exists. IDs include the owner UID/appointment/offset. Scheduling is serialized, checks the current account, reconciles existing OS identifiers, and clears pending metadata/local notifications on student-layout exit/sign-out. Confirmation history is preserved separately to prevent resend on this device. Cloud ownership continues to use Firebase Auth.

## Platforms

Native: `expo-notifications` schedules future date triggers at 24 hours and 1 hour before, and at the start of the device-local appointment date/time. Passed trigger times are not scheduled retroactively. Permission is requested when enabling reminders, or when an immediate booking notification needs an undetermined permission. An OS denial never prevents the booking or its in-app confirmation. Denied permission uses in-app reminders instead. Enable OS notification permission, rebuild a native development/production app after adding the plugin, and test on a physical device. Android alarm restrictions, battery settings, iOS limits and OS delivery policy mean these are practical reminders, not guaranteed alarms. No remote push server or tokens were added.

Web: **Background web push is not implemented.** While signed in with MindEase open, a due reminder card appears on student screens and links to My Appointments. The plan refreshes every minute and on foreground, and is rebuilt after reload from current Firestore data. This also catches thresholds missed while the browser was closed, until the appointment starts. Session-start notices remain visible for five minutes. A one-second in-app clock updates due banners; native reconciliation remains once per minute and on foreground/input changes. Enabling/disabling in another session is reflected by the settings listener.

Rescheduling/cancellation on another device reconciles native notifications when the affected device next receives Firestore data/opens the app. If the device is offline or closed, old local notifications can still fire before it reconnects. Signing out normally cancels local reminders; forced termination does not run JavaScript cleanup. No claim of server-backed delivery or cross-device cancellation is made. Appointment times keep the existing device-local-time interpretation; no timezone migration was introduced.


## Booking events and Reminder Status

After successful confirmation, the appointment UI calls the reminder service, which reads the canonical saved appointment and emits **Appointment confirmed** with its date/time and safely available counselor name. Native uses Expo local notifications; web and denied native permissions use an in-app banner. This confirmation is independent of `appointmentRemindersEnabled`. Double presses are guarded by the existing booking lock and stable appointment ID; a serialized, UID-scoped confirmation record deduplicates normal retries/reloads on this device. Confirmation history is local, not a promise of cross-device exactly-once delivery. If storage is cleared or the OS accepts a notification immediately before an unexpected storage/process failure, that history may be unavailable.

Reschedule shows **Appointment rescheduled**, without another booking confirmation. Cancellation shows **Appointment cancelled**. Both explicitly refresh the plan from current own bookings/settings, removing old 24h/1h/start triggers before a lifecycle notification permission prompt. The provider additionally observes changes from other sessions/counselors. Notification failures are logged and shown as status errors without turning a successful booking into a failed save.

`mindease_appointment_reminder_status:{uid}` stores per-appointment `confirmationSent`, `confirmationDelivery`, `reminder24hScheduled`, `reminder1hScheduled`, and `sessionStartScheduled`. No message bodies or counselor names are persisted in tracking. Cancelled/disabled entries retain confirmation history but have all timed flags false and no pending-plan records. No Firestore collection or appointment field was added.

The success/details UI shows **Reminder Status** for the current device. Native timed flags are based on actual pending OS notification identifiers; web/fallback flags describe future in-app plans and are labeled **Planned in-app**, never background-scheduled. Passed times show no longer pending, without claiming delivery. Old bookings show confirmation not recorded rather than inventing a sent state. Native acceptance of a request is not proof that the OS displayed it.

**Send test reminder** is rendered only under `__DEV__`; the service also rejects production use. It sends an immediate local test notification on native and an in-app test banner on web without altering booking or reminder tracking.

## Crisis signposting

`detectCrisisCue` checks explicit urgent phrases, not ordinary stress/exam words. Student sends and own edits continue normally. A visible callout offers Open Crisis Support at the authenticated or anonymous route; no bot, message blocking/deletion or emergency numbers are introduced. Existing own-message permissions/listeners are unchanged. The cue is a conservative signpost, not a clinical assessment, and cannot recognize all emergencies. Chat/support and booking/confirmation explain that the app does not replace professional care or emergency assistance.

## Verification

Run `node scripts/test-reminder-status-ui.cjs` for actual booking-handler, banner, tracking/disabled UI, and production-helper checks. Run `node scripts/test-appointment-notifications.cjs` for confirmation/dedupe/reload, actual tracking, reschedule/cancel/disable, permission fallback and web start-window checks with mocked Firebase/OS boundaries. Run service regressions plus `node scripts/test-reminders-and-crisis.cjs`, lint, TypeScript and web export. `scripts/test-notification-preference-rules.cjs` requires the Firestore emulator and verifies own settings, immutable identity and foreign/anonymous/counselor rejection. Native scheduled delivery must additionally be verified on a device with notification permission, including reschedule/cancel and disabled preference. Web should be checked with an upcoming appointment whose one-hour threshold has passed, then refresh and cancel it.

`node scripts/test-reminder-crisis-ui.cjs` exercises the actual send/routing and preference handlers. Run all security regressions locally with `npx firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-mindease "node scripts/run-rule-regressions.cjs"`. In this implementation session, the emulator download stalled and a direct binary download timed out, so emulator security tests could not execute. Service/screen regressions, lint, TypeScript and web export passed; native OS delivery was not tested on a physical device.

API reference: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).

## File inventory

Created:
- `src/utils/appointment-reminder-plan.ts`, `src/utils/crisis-cues.ts`
- `src/services/appointment-reminders.ts`, `src/services/reminder-notifications.ts`, `src/services/reminder-notifications.native.ts`
- `src/components/appointment-reminder-provider.tsx`, `src/components/appointment-reminder-banner.tsx`, `src/components/notification-preferences.tsx`
- `scripts/test-reminders-and-crisis.cjs`, `scripts/test-reminder-crisis-ui.cjs`, `scripts/test-notification-preference-rules.cjs`, `scripts/run-rule-regressions.cjs`
- This document.

Modified:
- `src/services/user-profile.ts` (settings-only helper/type)
- `src/app/student/_layout.tsx`, `src/app/student/profile.tsx`, `src/components/student-screen.tsx` (reminder/settings integration)
- `src/components/live-chat-screen.tsx`, `src/components/student-live-support.tsx` (crisis signpost and disclaimer)
- `src/components/appointment-screens.tsx` (booking/confirmation disclaimer only)
- `src/app/login.tsx`, `src/app/anonymous/home.tsx`, `docs/anonymous-mode.md`, `README.md`, `AGENTS.md` (truthful anonymous copy/documentation; allocation retained)
- `app.json`, `package.json`, `package-lock.json` (Expo notification dependency/plugin)
- `firestore.rules` (owner-only student reminder setting).

## Notification extension files

- src/utils/appointment-reminder-plan.ts
- src/services/appointment-reminders.ts
- src/services/reminder-notifications.ts
- src/services/reminder-notifications.native.ts
- src/components/appointment-reminder-provider.tsx
- src/components/appointment-reminder-banner.tsx
- src/components/appointment-reminder-status.tsx (new)
- src/components/appointment-screens.tsx
- src/components/notification-preferences.tsx
- scripts/test-reminders-and-crisis.cjs
- scripts/test-appointment-notifications.cjs (new)
- scripts/test-reminder-status-ui.cjs (new)
- scripts/render-student-previews.cjs (fixture support)
- tsconfig.json (check actual src, not archived upload copies)
- docs/appointment-reminders.md

No package, app config, appointment/note CRUD service, availability service, ownership rules, or Firestore rules changes were required.

## Immediate phone confirmation and viva

After the booking transaction succeeds, the reminder service reads the saved appointment (including the counselor name). The local notification title is **Appointment Confirmed** and its body uses the saved date/time formatted in device local time. Android uses the installed SDK's immediate channel-aware trigger; iOS uses `trigger: null`. Foreground banner/list presentation is enabled. Confirmation is independent of the timed-reminder preference and deduplicated per appointment on this device.

Permissions are checked before delivery; only an undetermined permission is requested. Denied permission leaves the appointment saved and displays: ?Appointment booked. Enable notifications in your device settings to receive reminders.? This also applies when timed reminders are disabled.

24-hour (**Appointment Tomorrow**), 1-hour (**Appointment in 1 Hour**) and session-start (**Your Session Is Starting**) notifications use the real counselor and local appointment time. Only future native triggers are scheduled. Reschedule replaces old times under the existing stable IDs; cancellation removes them. Firestore rules and appointment CRUD are unchanged.

For the phone demo: log in as a student, enable device permission, enable Appointment reminders in Profile, book a session at least 24 hours away, and inspect the real confirmation plus all three scheduled states in appointment details. In development, open those details and press **Send test reminder** for immediate OS notification testing. This existing button and service are guarded by `__DEV__`. Deny permission and book again to verify the graceful fallback; disable the preference and verify confirmation still arrives but timed notifications are absent. Actual delivery, locked/background behavior and device settings require physical Android/iOS verification. **Background web push is not implemented.**
