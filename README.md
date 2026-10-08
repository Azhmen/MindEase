# MindEase

MindEase is an Expo and React Native mobile app built with TypeScript and Expo Router.

Guest care is available through Continue Anonymously, with separate mood CRUD and real counselor chat. See [anonymous setup, security, and testing](docs/anonymous-mode.md) before enabling the Firebase Anonymous provider and publishing rules.

## Get started

Install dependencies and start the Expo development server:

```bash
npm install
npm start
```

Open the project in Expo Go, an emulator, or a simulator using the options shown by Expo.

## Project structure

- `src/app/` contains the Expo Router routes.
- `src/components/` contains reusable UI components.
- `src/constants/` contains shared colors, typography, spacing, and border-radius tokens.

Entry routes:

- `/login`
- `/student/home`
- `/counselor/dashboard`

The root route shows the MindEase splash screen for 2.4 seconds, then opens `/login`. Firebase initializes in the root layout. Login and registration use Firebase. Student home links to mood check-in, mood history, Live Support, and crisis support, with logout retained. The counselor dashboard shows the signed-in counselor profile, live assigned chat count/recent conversations, and navigation to Chats. Session/availability summaries now show real assigned sessions and available slots. Schedule opens counselor availability; Profile supports editable counselor details and public-directory synchronization; see [counselor dashboard notes](docs/counselor-dashboard.md).

See [Azhmen's feature notes](docs/azhmen-features.md) for mood setup and [live chat setup](docs/live-chat.md) for real-time student-counselor chat using Firestore, directory setup, and the two-account acceptance checklist. `firestore.rules` must be published before relying on server-enforced ownership. Run `node scripts/test-student-services.cjs` for mock service tests; these do not verify deployed rules or live persistence.

See [student flow and visual system](docs/student-flow.md) for the mobile layout and Home/Mood/Resources/Profile navigation. [Gihani's features](docs/gihani-features.md) add separate mood reflections, resource browsing and saved-resource CRUD. Profile also links to [Tharukanan's appointment booking and pre-session note CRUD](docs/tharukanan-features.md), with published counselor availability selection and soft cancellation. Slot selection is read-only and does not reserve a slot; see [Kiyathan scheduling](docs/kiyathan-features.md).

See [mood ownership](docs/mood-ownership.md) for the allocation boundary: Azhmen owns `mood_entries` CRUD and live chat; Gihani owns Mood History presentation, separate `mood_reflections` CRUD, and `saved_resources` CRUD. Manage original check-in keeps Azhmen's original entry controls separate from reflection actions.

## Firebase

Set these variables in your local `.env` file using the Firebase console's web app configuration:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Restart Expo after changing environment variables. Configuration values are read in `src/config/firebase.ts`, which exports `app`, `auth`, and `db` and reuses the default app during Fast Refresh.

`src/services/auth.ts` exports `registerUser(email, password)`, `loginUser(email, password)`, `logoutUser()`, and `getCurrentUser()`. Registration and login return Firebase `UserCredential`; errors are passed to the caller. `getCurrentUser()` is a synchronous snapshot and can return `null` during startup; wait for `auth.authStateReady()` or subscribe with `onAuthStateChanged` before deciding whether a session exists.

`src/services/user-profile.ts` exports `createUserProfile({ uid, name, email, role })` and `getUserProfile(uid)`. Profiles are stored at `users/{uid}` with a server-generated `createdAt` timestamp and `appointmentRemindersEnabled: false`. Roles are `student` or `counselor`. Call profile creation after registration using `credential.user.uid` and `credential.user.email`. Transactional creation verifies the authenticated UID/email and preserves an existing matching profile on retry. Reading returns `null` if the document does not exist.

Email/Password authentication and Firestore must be enabled in the Firebase console. Firestore security rules must allow the intended authenticated profile reads and writes; a client-provided role alone does not grant counselor permissions. No Firebase rules are deployed by this project yet.

Run `npm run web` to preview Expo web. Run `npm run lint` and `npx tsc --noEmit` to check the code.

## Authentication flow

Tap Create Account on Login to open `/register`. Enter a name, email, password (at least six characters), matching confirmation, and a student or counselor role. Registration creates the Firebase Auth user, then writes the profile to Firestore before opening the selected role's destination. If saving the profile fails, stay on the screen and use Retry profile after fixing the error; this reuses the created account. Reloading before completing that step loses the retry state, so an account without a profile will need its `users/{uid}` document completed manually. Counselors require manual directory setup and activation before appearing in student selection; see [registration setup](docs/registration.md).

Login uses one shared layout for Student and Counselor, with Student selected initially. It authenticates the email/password, fetches `users/{uid}`, and verifies the stored role matches the selected role before routing students to `/student/home` or counselors to `/counselor/dashboard`. A role mismatch signs the account out and shows a clear error. Missing or unsupported roles show an error. Log out signs out of Firebase before returning to Login. Both forms show loading and Firebase errors and disable controls during requests.

Campus Portal SSO, Forgot Password, and Remember device are visual placeholders. Continue Anonymously uses Firebase Anonymous Authentication and a system-generated anonymous UID for secure data isolation; it does not collect name/email/student ID or link data to normal accounts. Email or ID currently accepts email only. Password visibility works locally. The splash logo and quote-card garden thumbnail use vector approximations of the supplied Figma reference.

For manual testing, register one account for each role, log out, log back in, and confirm the destination and profile fields in Firebase. Also test mismatched passwords, invalid credentials, duplicate email, and denied Firestore access. Role routing controls navigation; enforce access to future student/counselor data through Firestore security rules.


Kiyathan scheduling integration: see docs/kiyathan-features.md for current real availability reads, counselor session status controls, and the read-only slot-selection limitation. Earlier demo/coming-soon scheduling descriptions are superseded. Other CRUD ownership remains unchanged.
