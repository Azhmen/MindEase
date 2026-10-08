# Tharukanan: appointment booking and pre-session notes

## Flow and ownership
Profile → My Appointments → Book a Counselor → optional Pre-Session Note → Confirm Appointment → Appointment Booked.
View / Edit opens the appointment and its note. Student routes remain inside the existing role guard and mobile Home / Mood / Resources / Profile shell.

Routes: /student/appointments, /student/appointments/book, /student/appointments/pre-session, /student/appointments/confirm, /student/appointments/success and /student/appointments/edit/[id]. A (booking) route group scopes the draft provider without changing these URLs; its appointments.tsx entry avoids Expo's Windows folder-index type-generation mismatch.

Tharukanan owns these services and collections only. Mood, chat, anonymous mode and counselor route protection are unchanged. No counselor session-status, appointment approval, availability management, saved resources or mood reflection CRUD is added.

## Data
`appointments/{appointmentId}`: studentId, counselorId, counselorName, appointmentDate (local YYYY-MM-DD), appointmentTime (24-hour HH:mm), sessionFormat (Virtual / In-Person), status, createdAt, updatedAt.
The displayed counselor name is copied from the real directory record at confirmation. Directory IDs must be actual counselor Auth UIDs with counselor-role profiles.

`pre_session_notes/{appointmentId}`: studentId, appointmentId, note, createdAt, updatedAt.
One note per appointment; note ID equals appointmentId. Topics are saved as an optional readable prefix in the note, rather than adding undocumented appointment fields. Empty notes create no document. Topic + note content is limited to 2,000 characters.

## CRUD behavior
- Appointment Create: a memory-only draft allocates one document ID; confirmation transaction writes the appointment and optional note atomically. Retry/double-tap reuses that ID rather than creating a second booking. Buttons have synchronous locks. No write occurs while selecting details.
- Read: queries only the current student's appointments, upcoming first in date/time order, then past/cancelled newest first. Detail and list read Firestore again on focus/reload.
- Update: future booked/rescheduled appointments can change date, time and format. Counselor selection and ownership remain immutable after booking. Status becomes rescheduled and updatedAt uses serverTimestamp.
- Delete: Cancel is deliberately a **soft delete** (status cancelled), with confirmation. History and linked notes remain; clients cannot hard-delete appointments. Cancelled/completed/past appointments cannot be rescheduled by these services. Student clients cannot mark sessions completed.
- Notes: create/add, read, edit and confirmed hard-delete are available in appointment details, independently of cancellation. Ownership is checked in services and rules; updates preserve studentId, appointmentId and createdAt.

Drafts are not stored in URLs or local storage. Refreshing an unfinished booking requires restarting; saved appointments and notes persist. No calendar integration, meeting link or campus location is claimed.

## Counselor availability integration
The picker consumes Kiyathan's published future available slots for the chosen counselor/date/format. Demo time options were removed. Confirmation/rescheduling re-check availability before calling the unchanged student services. Slot selection is read-only and does not reserve the slot; concurrent bookings remain possible. See docs/kiyathan-features.md.

## Firestore setup
Publish the updated firestore.rules in Firebase Console before using booking. Existing users/mood/chat rule blocks are preserved. New appointment/note rules enforce student role, own studentId, valid fields, active counselor membership, server timestamps, immutable ownership and permitted status transitions. Kiyathan adds assigned-counselor appointment reads/status-only updates and linked-note get-only access; student CRUD remains unchanged. Notes created with the appointment use getAfter ownership validation for the atomic write.

Use existing counselor_directory records keyed by actual counselor Firebase UID, with name and active true (or omitted), and users/{uid}.role counselor. Optional title/specialty are display-only. No hardcoded counselor IDs or fake bookings are seeded. No composite index is needed: queries filter by studentId and sort locally.

## Validation and tests
Run npm run lint, npx tsc --noEmit, npx expo export --platform web, node scripts/test-appointments.cjs, npm run test:services, and node scripts/render-student-previews.cjs.
Service mocks verify booking confirmation, atomic failures, repeat confirmation, validation, reschedule, soft cancellation, note CRUD, role/ownership rejection and reload persistence. Rendered fixtures cover populated/empty/cancelled appointments, counselor selection/empty/error states, note, confirmation, success and edit screens.

Emulator security test:
`npx firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-mindease "node scripts/test-appointment-rules.cjs"`
Requires the Firestore emulator and Java. It checks genuine rules enforcement; mock service tests do not verify deployed rules.

Manual Firebase acceptance: student login → Profile → My Appointments → select active counselor → future published available date/time → optional topics/note → confirm → view → reload → reschedule → reload → cancel and check cancelled history. Add/edit/delete the note in details. With a second student, confirm direct access to the first student's appointment/note is denied. Repeat Mood CRUD and Live Chat acceptance after publishing rules. Interactive browser/Firebase acceptance was not available in this session.


Kiyathan scheduling integration: see docs/kiyathan-features.md for current real availability reads, counselor session status controls, and the read-only slot-selection limitation. Earlier demo/coming-soon scheduling descriptions are superseded. Other CRUD ownership remains unchanged.
