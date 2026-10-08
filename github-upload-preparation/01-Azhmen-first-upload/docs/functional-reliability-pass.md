# Functional reliability pass — October 8, 2026

## Fixes

Appointment cancellation now writes `status: cancelled` through Tharukanan's existing service, removes the card from local list state immediately after the successful write, and then completes existing reminder cleanup. My Appointments filters cancelled records both on load and during rendering; completed records remain visible. Cancel Appointment performs the operation with one tap and uses a synchronous lock plus disabled/loading controls. Failed writes retain the card and display an error.

Appointment Details uses the same guarded cancellation service, updates its local status immediately, then returns to My Appointments after reminder cleanup. Reschedule and cancellation share one mutation lock so they cannot run concurrently. The existing 24-hour, 1-hour and session-start cleanup and local tracking logic are unchanged.

Resource saves now provide temporary success feedback while retaining immediate Saved state and the existing deterministic-document transaction/idempotency behavior. Remove from Saved performs the removal with one tap and immediately removes the saved-list card after a successful write. Original resources remain read-only. Catalog/details reread saved state on focus, so returning after removal restores Save.

Personal notes and favorites already used synchronous locks, awaited writes, current-text edit drafts and immediate parent-card updates. Extended tests confirm double presses perform one transaction, editing starts with the existing note, and save/remove reload behavior preserves data and ownership. The existing service updates `updatedAt` and preserves `savedAt`.

Pre-session note saves now update local note/text state after the write instead of relying on a second fetch. Counselor session status similarly updates local session state immediately instead of refetching the session/note. Counselor pre-session notes remain read-only.

Reflection create/edit/delete callbacks now immediately update the history's local reflection state after a successful reflection write. Original mood entries are untouched. Chat edits/deletes update the local message collection after a successful write; existing registered/anonymous real-time listeners remain intact and reconcile authoritative data. Send retains its existing synchronous lock and real-time listener behavior.

Mood create/edit/delete, availability CRUD, booking, reminder scheduling and service-level ownership were audited with the existing regressions. They retain their existing services and guards. Shared keyboard tap handling is preserved. `useTemporaryFeedback` is unchanged: success approximately 3 seconds, errors persistent.

## Files changed

Application:

- `src/components/appointment-screens.tsx`
- `src/components/resource-screens.tsx`
- `src/components/counselor-management-screens.tsx`
- `src/components/live-chat-screen.tsx`
- `src/components/mood-reflection-panel.tsx`
- `src/components/mood-log-card.tsx`
- `src/app/student/mood/history.tsx`

Regression/preview support:

- `scripts/test-appointment-cancellation-ui.cjs` (new)
- `scripts/test-saved-resource-flow.cjs`
- `scripts/test-availability-delete.cjs`
- `scripts/render-student-previews.cjs`
- This report; regenerated preview artifacts in `artifacts/student-previews`.

No theme/layout redesign, service/schema/collection changes, CRUD ownership changes, navigation destination changes or Firestore rules changes were made.

## Validation

- TypeScript: passed.
- Project lint: passed.
- All 20 non-emulator feature/UI regression scripts: passed. Added targeted assertions for cancellation, duplicate saves, pre-session note state and counselor session state.
- Expo export: web, Android Hermes and iOS Hermes passed; 47 exported web routes.
- 70 route/component fixture previews rendered successfully. Browser smoke checks at 320px/430px cover 140 layouts.
- All 32 protected service/hook/utility/Firebase configuration/rules files match their pre-polish hashes.

The regressions use isolated Firebase/OS boundaries. Preview data remains test-only. Production authenticated data flows and actual Android/iOS notification delivery require a live/device smoke test; emulator rule enforcement is not claimed by this run.

## Known limitation

Appointment slot reservation remains non-atomic: simultaneous bookings for the same published slot are theoretically possible until atomic reservation is implemented. This pass intentionally preserves that behavior.
