# Kiyathan: Availability and Sessions

Kiyathan owns exactly two feature sets: counselor_availability CRUD and counselor-side session read/status update.

## Ownership
- Azhmen: mood_entries CRUD and real-time Live Chat (unchanged).
- Tharukanan: student Appointment CRUD and Pre-session Note CRUD (service modules unchanged).
- Gihani: Mood History/reflection CRUD and Self-Help/saved resource CRUD (unchanged).
- Kiyathan: own counselor_availability CRUD; read assigned appointments and update status/updatedAt only. No appointment creation, rescheduling or deletion, and no note edits/deletes.

## Availability
Routes: /counselor/availability, /counselor/availability/new, /counselor/availability/edit/[id]. Schedule tab opens availability; the old /counselor/schedule redirects there.

Documents contain counselorId, date (YYYY-MM-DD), startTime/endTime (HH:mm), mode (virtual/in_person), location, isAvailable, createdAt and updatedAt. Local device time is used. Date validity, end-after-start, mode and in-person location are validated. All owner IDs come from Firebase Auth, all writes use server timestamps. Delete requires confirmation and does not touch appointments.

## Booking integration and limitation
Tharukanan's existing picker now reads published available future slots; startTime becomes appointmentTime and the selected format must match mode. Unavailable slots are excluded. Confirmation/rescheduling re-check availability before calling the original student CRUD services. Existing appointments are still readable, even if their slot was deleted.

Selection is READ ONLY. No availability ID or reservation is added to appointments; confirming does not consume the slot. A concurrent booking or counselor edit may race the final save, and duplicate bookings remain possible. The UI discloses this. Atomic reservations, conflict/overlap detection and cancellation releasing slots need a separate coordinated booking change. No demo time choices remain in the picker.

## Sessions
Routes: /counselor/sessions, /counselor/session/[id]. Dashboard links to Sessions, shows real today/virtual counts and future available-slot count, plus today's assigned session cards. Existing live-chat sections are preserved.

Only counselorId == current UID appointments are queried. Student labels are generic because private user profiles are not readable by counselors; no account IDs or anonymous chat identity are shown. Notes are fetched by appointment ID read-only. Status preserves booked/rescheduled/cancelled/completed compatibility: booked or rescheduled sessions may be marked completed or cancelled, with confirmation. Closed sessions cannot be reactivated. in_progress/no_show are not introduced. Lists/dashboard reload on focus; the student sees status changes after refresh/return to the appointments screen. Chat's real-time listeners are unaffected.

## Firebase setup
Publish firestore.rules before using these screens (Firebase Console or firebase deploy --only firestore:rules). Keep Email/Password and Anonymous Auth as configured. Counselor users need their existing users/{uid} profile role counselor; booking requires an active counselor_directory/{same actual Auth UID} entry. Create slots through the counselor UI. No composite index is required: equality queries are sorted/filtered locally. No other collection grants were loosened; assigned counselor note access is get-only, and session writes permit only status and updatedAt.

## Verification
Run npm run lint, npx tsc --noEmit, npx expo export --platform web and the service regression scripts. Mock service tests are not a replacement for deployed-rule/emulator or two-account Firebase acceptance testing.

## Files in this implementation
Created:
- src/services/counselor-management.ts
- src/components/counselor-management-screens.tsx
- src/hooks/use-counselor-schedule.ts
- src/app/counselor/availability.tsx
- src/app/counselor/availability/new.tsx
- src/app/counselor/availability/edit/[id].tsx
- src/app/counselor/sessions.tsx
- src/app/counselor/session/[id].tsx
- scripts/test-kiyathan-services.cjs
- scripts/test-kiyathan-rules.cjs
- docs/kiyathan-features.md

Modified:
- src/app/counselor/dashboard.tsx
- src/app/counselor/schedule.tsx
- src/components/counselor-ui.tsx
- src/components/appointment-ui.tsx (availability picker only)
- src/components/appointment-screens.tsx (slot checks/availability copy only)
- src/constants/booking.ts (remove unused demo times)
- firestore.rules
- AGENTS.md
- README.md
- docs/counselor-dashboard.md
- docs/tharukanan-features.md
- scripts/test-appointment-rules.cjs (assigned counselor read expectations)
- scripts/render-student-previews.cjs (availability/session fixtures and real-slot copy)

Generated: Expo dist output and rendered HTML fixtures in artifacts/student-previews.

## Results from this implementation
- npm run lint: passed, no warnings.
- npx tsc --noEmit: passed.
- npx expo export --platform web: passed, 44 static routes, output dist.
- test-kiyathan-services.cjs: passed availability CRUD, validation, account isolation/reload, available future-slot filtering, assigned sessions/note reads, completion/cancellation, field preservation and student-visible status.
- Existing test-student-services.cjs, test-appointments.cjs, test-gihani-services.cjs: all passed.
- render-student-previews.cjs: passed existing and new screen fixtures, zero/one/several dashboard session fixtures, chat/privacy regression fixtures, availability edit/delete and closed/error session states. These are rendered markup assertions, not interactive browser testing.
- Protected Mood/Chat/Appointment/Note/Reflection/Resource services are byte-for-byte unchanged.
- Real Firebase two-account acceptance and emulator rules execution were not available. The Firestore emulator binary is not installed locally. Rules tests are provided; run with the Firestore emulator before production use:
  npx firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-mindease "node scripts/test-kiyathan-rules.cjs"
