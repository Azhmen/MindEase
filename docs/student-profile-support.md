# Student profile and support

Student Profile uses the existing users/{uid} document. updateCurrentStudentProfile validates and trims name (required, 100 characters), preferredName (optional, 100), faculty (optional, 120), and yearOfStudy (optional string 1–8). Its transaction checks the current authenticated UID and student role and updates only those fields plus a server updatedAt. Email, UID, role, createdAt and reminder settings are preserved.

The screen updates its displayed profile after a successful write. Cancel discards drafts. Appointment reminders reuse NotificationPreferences and setAppointmentRemindersEnabled; the existing reminder observer continues to reconcile scheduling. Logout reuses LogoutButton.

Profile links to appointments, saved resources, mood history, crisis support, /student/support and /student/privacy. Support search and category chips filter local informational cards. FAQ and Platform Guide expand inline; technical/admin contacts are institution placeholders. No support collection or CRUD was added.

Privacy copy describes actual role restrictions and separate Firebase anonymous UIDs without claims of identifier-free operation, guaranteed confidentiality or app-provided emergency response.

Publish firestore.rules before using profile editing. Only the existing users student-update grant changed: approved profile fields/settings, limits, valid year and server updatedAt. Registration identity and all other collection permissions remain protected. No member CRUD ownership changed.

Checks: scripts/test-student-profile-support.cjs exercises actual services with an in-memory Firestore boundary. scripts/test-student-profile-screen.cjs exercises actual profile handlers with mocked native widgets/auth/Firestore. Updated notification-preference rule tests require the Firestore emulator. These do not substitute for live Firebase login, refresh and cross-account verification.
