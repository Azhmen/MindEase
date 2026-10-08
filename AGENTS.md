# MindEase Project

MindEase is an IT3060 HCI Assignment 3 mobile application.

## Tech Stack
- React Native
- Expo
- Expo Router
- TypeScript
- Firebase Authentication
- Cloud Firestore

## Roles
- Student
- Counselor

## Student Features
- Onboarding
- Login / Registration
- Student Home
- Mood Check-in
- Mood History
- Appointment Booking
- Pre-session Notes
- Live Chat
- Crisis Support
- Self-Help Resources
- Saved Resources
- Profile

## Counselor Features
- Counselor Dashboard
- Today's Sessions
- Student / Pre-session Information
- Session Status
- Availability Management
- Profile
- Support

## CRUD Allocation
### Azhmen
- Mood Check-in CRUD on mood_entries
- Chat Create/Read on chat_threads/{threadId}/messages (real-time student-counselor chat using Firestore)
- Optional chat message Update/Delete is restricted to the authenticated sender's own messages.
- Anonymous student support uses separate anonymous_mood_entries CRUD and anonymous_chat_threads messages, secured by Firebase Anonymous Auth. Preserve authenticated behavior; see docs/anonymous-mode.md.
- Anonymous mode does not collect name, email or student ID. A system-generated anonymous Firebase UID isolates session data; it is not linked or migrated to a normal student account.

### Tharukanan
- Appointment CRUD
- Pre-session Note CRUD
- Appointment cancellation is soft-delete (status cancelled); pre-session notes use one document per appointment with full own-note CRUD. See docs/tharukanan-features.md.
- Booking consumes Kiyathan's published availability read-only; appointment and note CRUD remain Tharukanan's. Slots are not atomically reserved.
- Appointment reminder support observes existing bookings without changing CRUD ownership. Student settings use users.appointmentRemindersEnabled; device-local reminder metadata creates no new Firestore collection. See docs/appointment-reminders.md.

### Gihani
- Mood History + mood_reflections CRUD (mood_entries is read-only for Gihani)
- Self-Help Resources + saved_resources CRUD (personalNote and favorite; original resources are read-only)

### Kiyathan
- counselor_availability CRUD (own counselor slots)
- Counselor-side session READ + status UPDATE on assigned appointments only
- No appointment creation/rescheduling/deletion or pre-session note writes. See docs/kiyathan-features.md.

### Mood ownership boundary
- Azhmen owns all create/read/update/delete operations on mood_entries for the authenticated student's own entries.
- Gihani owns /student/mood/history presentation and its reflection actions. Manage original check-in preserves Azhmen's separate Edit/Delete controls on mood_entries.
- Gihani's reflection CRUD uses only mood_reflections; it must not edit or delete mood_entries. See docs/mood-ownership.md for the implemented schema and ownership boundary.

## Development Rules
- Build incrementally.
- Keep the app runnable in Expo.
- Use TypeScript.
- Use Expo Router.
- Use reusable React Native components.
- Use Firebase Authentication and Cloud Firestore.
- Follow the existing Figma prototype closely.
- Do not redesign unnecessarily.
- Keep code simple enough for viva explanation.
- Test after each major change.
