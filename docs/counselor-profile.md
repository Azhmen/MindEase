# Counselor Profile

/counselor/profile now reads the signed-in counselor's users/{uid} and supports Edit Profile, Save Changes and Cancel. Email/role remain read-only; the existing logout and Support Options link are retained. The counselor frame stays centered at 410px on web and scrolls vertically.

Optional fields added to UserProfile: title, specialization, bio, officeLocation, phoneExtension and updatedAt. Name is required; all editable text is trimmed. Limits are name/title 100, specialization 160, officeLocation 200, bio 1000 and phoneExtension 30 characters. Empty optional text clears the value.

Services in src/services/user-profile.ts:
- getCurrentCounselorProfile(): current Auth UID and counselor-role read.
- validateCounselorProfile(): normalize and validate editable fields only.
- updateCurrentCounselorProfile(): transaction updates users and counselor_directory together, returning normalized editable fields for immediate UI display.

Registration's createUserProfile and getUserProfile behavior is unchanged. Updates never change uid, email, role or createdAt, and never call Firebase Auth email/password update APIs.

The profile editing transaction updates only name, title and specialization. Existing active and public/admin fields are preserved. Private bio, location, extension and email are never copied there. Registration/login/restored dashboard setup separately creates missing own directory membership; it never reactivates an existing disabled record. See counselor-discovery.md for the current provisioning policy.

Rules permit only the counselor's own editable fields, enforce lengths/timestamps and require public profile synchronization through getAfter. Directory updates permit only the three public fields and require a matching private-profile update. Student profile updates, foreign-account edits and identity/status changes remain denied. Every other collection rule is unchanged; Kiyathan's Availability/Session and other owners' CRUD services are unchanged.

Dashboard reads profile name and title on navigation focus, so returning from Profile reflects saved values. Student chat/booking pickers now use realtime directory listeners. Existing appointments retain the counselor name stored when booked; historical booking data is not rewritten.

Manual Firebase steps: publish firestore.rules. Existing users/{uid}.role must be counselor; missing own directory membership is then provisioned automatically on registration/login/dashboard setup. No new collection, Auth provider or indexes are needed.

Validation: node scripts/test-counselor-profile.cjs verifies edit/trim/limits, atomic failures, persistence, public picker updates, identity/privacy/active preservation and role isolation. Emulator tests are provided in scripts/test-counselor-profile-rules.cjs; run inside the Firestore emulator before production use. Real Firebase/browser acceptance is not replaced by mocks.

Changed files: src/services/user-profile.ts, src/app/counselor/profile.tsx, src/app/counselor/dashboard.tsx, firestore.rules, scripts/render-student-previews.cjs, docs/counselor-dashboard.md and README.md. Created: this document, scripts/test-counselor-profile.cjs, scripts/test-counselor-profile-screen.cjs and scripts/test-counselor-profile-rules.cjs.

Screen-handler tests pass load/Edit/Cancel/validation/network failure/Save/reload, read-only identity, and retained Support/Logout controls. Rendered fixtures cover profile read/edit and updated dashboard title. A loaded profile UID is checked on save to reject drafts from a previous authenticated account. Existing Mood/Chat/Appointment/Note/Reflection/Saved Resource/Availability/Session service regressions passed. No real Firebase/browser acceptance or emulator execution was available locally; the emulator binary is not installed. Rules must be published manually.

Final checks: npm run lint passed without warnings; npx tsc --noEmit passed; npx expo export --platform web passed (45 static routes, dist output).
