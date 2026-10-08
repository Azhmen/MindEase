# Account registration

Login exposes **Don't have an account? Create Account** between Sign In and Continue Anonymously. `/register` uses the same MindEase inputs/cards and Student/Counselor role selector, with an **Already have an account? Sign In** link back to `/login`.

Full name and email are trimmed; password and confirmation are trimmed consistently during registration. Name is required (maximum 100 characters), email must be valid, password needs at least six characters, confirmation must match, and role must be student or counselor. Firebase also enforces its configured password policy. Known Firebase duplicate-email, invalid-email, weak-password and network errors use the existing readable error mapping.

Email/Password Auth creates the account first. The app then creates only `users/{currentAuthUid}` with `uid`, `name`, `email`, `role`, `createdAt: serverTimestamp()` and `appointmentRemindersEnabled: false`. Passwords never enter Firestore. A synchronous lock prevents duplicate submissions. If profile creation fails after Auth succeeds, Retry profile reuses the created user. A transaction recognizes an already-created matching profile after an uncertain response and preserves its settings and original creation timestamp.

Student registration routes to `/student/home`; counselor registration routes to `/counselor/dashboard`. Existing login role checks and Anonymous Auth behavior remain intact. An anonymous account is not linked or its data migrated during Email/Password registration.

Counselor registration, login, and restored dashboard sessions now create a missing `counselor_directory/{same actual Auth UID}` using only name, title, specialization, active, bookingAvailable, chatAvailable, and updatedAt. New records default all three availability booleans to true, as requested for this assignment. Existing records are never overwritten by this setup step, including inactive records. Students and anonymous accounts cannot provision membership. Private email/bio are never copied. Publish the updated firestore.rules before using this behavior. See counselor-discovery.md for discovery, security boundaries, and limitations.

**Republish firestore.rules**: own-profile creation now allows appointmentRemindersEnabled only as false; strict key, UID/email/role, name and timestamp checks remain. Older registration clients without the optional preference are accepted (missing still means disabled). Counselor directory client creation/activation remains denied; other collection rules are unchanged.

Validation: `node scripts/test-registration-flow.cjs` exercises actual registration/login handlers with isolated Firebase boundaries. Run existing regressions, lint, TypeScript and Expo web export. Real Firebase Console/account/device acceptance and emulator security tests still need a configured environment.
