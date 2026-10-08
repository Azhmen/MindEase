# Anonymous student flow

Anonymous mode does not collect your name, email, student ID, or other personally identifying profile information. A system-generated anonymous Firebase UID is used to securely isolate your anonymous session data. Anonymous does not mean that no identifier exists: Firebase persists anonymous authentication credentials, and anonymous Firestore records contain anonymousUid. No automatic linking or migration to a normal account occurs. Avoid typing identifying details into free-text notes or messages.

Continue Anonymously signs in with Firebase Anonymous Authentication, without collecting a name, email, student ID, or creating a users profile. It reuses an existing anonymous Firebase session. If a normal student/counselor is still signed in, the button first awaits signOut and then anonymous sign-in; the normal account is not deleted or linked. A loading label and shared authentication lock prevent duplicate or competing sign-in actions. Navigation occurs only after anonymous authentication and the local session ID are ready.

The app stores only a cryptographically random UUID under `mindease_anonymous_session_id` using AsyncStorage (browser localStorage on web). It does not put the Firebase UID or personal details in this application key. Firebase separately persists its authentication credentials: existing web persistence is preserved, and native authentication now uses Firebase's AsyncStorage persistence adapter. The app waits for Firebase restoration before entering the guest routes. A local UUID alone never grants database access.

## Routes and navigation

- `/anonymous/home`: Anonymous / Guest label, today's mood, Mood Check-in, Mood History, Live Support, Crisis Support, and Back to Login. No Profile or account settings.
- `/anonymous/mood`: shared MoodForm; save redirects to guest history.
- `/anonymous/mood/history`: newest first, own entries only, Edit and confirmed Delete.
- `/anonymous/mood/edit/[id]`: same MoodForm, mood/note edits and updated timestamp.
- `/anonymous/chat`: shared Live Support; one active counselor auto-assigns, several show a picker. Existing thread opens directly. Both participants get real-time messages, compact sender-only action popup, composer editing, and separate delete confirmation.
- `/anonymous/crisis-support`: reuses the existing crisis content without login; no invented numbers.

Guest bottom navigation is Home / Mood / Support / Crisis. The authenticated student's Home / Mood / Resources / Profile navigation is unchanged. Counselor Chats merges assigned authenticated and guest threads. Guest threads and conversation headers show **Anonymous Student**, without displaying the UID, session ID, student ID, name, or email.

## Firestore schema

`anonymous_mood_entries/{entryId}`:

```text
anonymousUid  // Firebase anonymous UID; security ownership, not a personal profile
sessionId     // random application UUID
mood          // Great, Good, Okay, Low, Very Low
moodScore     // 5, 4, 3, 2, 1
note          // trimmed, optional
createdAt     // server timestamp
updatedAt     // server timestamp
```

`anonymous_chat_threads/{sessionId}`:

```text
sessionId
anonymousUid
counselorId   // actual Auth counselor UID from counselor_directory
createdAt
lastMessage
lastMessageAt
```

`anonymous_chat_threads/{sessionId}/messages/{messageId}`:

```text
anonymousUid  // the thread's anonymous owner, on either sender's message
senderType    // anonymous | counselor
text          // trimmed, 1–2,000 characters
createdAt
edited        // false initially; true after edit
updatedAt
```

No anonymous document stores a personal student identity. UIDs are pseudonymous access-control identifiers, not proof that a conversation contains no identifying information; users can still type personal information into notes/messages. The counselor remains a real signed-in account. Message ownership follows senderType and the thread's immutable owner/assigned counselor; clients cannot impersonate the opposite sender, reassign the counselor, or change message identity/timestamps when editing.

Mood history queries the current anonymous UID then filters the local session ID. Thread/message rules verify UID ownership and assigned counselor membership, not possession of the session ID. New threads validate an active counselor and counselor user profile. Message sends and previews are atomic. Own edits/deletes use transactions and preserve sender/creation fields. Latest edits update preview text; latest deletions use Message deleted without changing the send time. No custom composite index is required.

Existing `users`, `mood_entries`, `chat_threads`, and counselor_directory rules remain unchanged. Authenticated mood/chat service implementations remain unchanged. No appointments, saved resources, reflections, sessions, or availability CRUD is added.

## Firebase setup

1. In Firebase console, Authentication → Sign-in method, enable **Anonymous** alongside existing **Email/Password**. [Official Firebase anonymous-auth guide](https://firebase.google.com/docs/auth/web/anonymous-auth).
2. Publish the updated `firestore.rules`. Remove overlapping broad test grants. Guest collections are created on the first write; no manual collection creation is necessary.
3. Keep real counselor accounts, `users/{counselorUid}.role = counselor`, and admin-managed `counselor_directory/{counselorUid}` with name and active true.
4. Restart Expo after installing the new Expo-compatible AsyncStorage and expo-crypto dependencies. Rebuild a custom native development client if it does not contain those modules.

Refresh/restart retains the Firebase guest session and local session ID. Back to Login signs out, clears the application session ID, and does not link/copy data to a student account. Starting again creates a new guest principal/session. Previous cloud records remain but cannot be recovered through the app after exit, cleared browser storage, or Firebase account removal. Anonymous-provider automatic account cleanup, if enabled, also affects recoverability; use the Firebase settings appropriate to the project.

## Verification

`node scripts/test-student-services.cjs` tests real TypeScript services against an in-memory SDK boundary: guest start/reuse/exit, local data minimization, Mood CRUD, sender-only chat changes, two-way listeners, persistence on module reload, and existing student CRUD/login behavior. It is not a deployed Firebase integration test.

`npx firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-mindease "node scripts/test-firestore-rules.cjs"` runs actual Firestore rules against a local demo project. It verifies guest mood CRUD/isolation, assigned counselor access, real two-way listeners, sender-only edit/delete, forged identity denial, persistence through a fresh SDK context, and normal student mood/chat permissions. It never accesses production data.

Run `npm run lint`, `npx tsc --noEmit`, and `npx expo export --platform web`.

Current implementation validation: service tests and rendered guest/counselor fixtures passed; lint, TypeScript, and the 22-route web export passed. The rules test is provided but was not executed because the official emulator download stalled/was too slow. Real Firebase provider sign-in, native runtime persistence, and two-browser acceptance remain manual checks; no browser session was available. The existing authenticated mood service and authenticated users/mood/chat rule blocks were compared and preserved.

Manual acceptance with a configured project and two browser profiles/devices:

1. From signed out, Continue Anonymously → Home. Confirm no profile/name/email fields.
2. Create mood, reload history, edit, cancel deletion once, then delete.
3. Open Live Support, start/pick counselor, send a message.
4. Counselor opens Chats → Anonymous Student, reads and replies. Both sides receive changes without refresh.
5. Edit/delete each sender's own message. Ensure the other sender has no action menu and direct forbidden requests fail.
6. Open Crisis Support, return Home, refresh/restart, and confirm session/conversation persistence.
7. Back to Login, sign in as a normal student, and verify the original mood/chat CRUD. Guest data must not appear in the student account.
