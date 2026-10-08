# Azhmen's student features

Implemented routes: `/student/mood`, `/student/mood/history`, `/student/mood/edit/[id]`, `/student/chat`, `/student/crisis-support`. Student home links to each feature and keeps logout. The student layout waits for restored authentication and checks the stored profile role.

Mood services use `mood_entries`. The Firestore document ID supplies the entry's `id` when reading; it is not duplicated in the document. Entries store the current user's UID, mood, score (Great=5 through Very Low=1), trimmed optional note, and server-created timestamps. History filters by current UID and sorts newest first locally, so no composite index is required. Update preserves creation time; deletion uses a confirmation card that works on native and web.

Azhmen owns this collection's entire CRUD. The history route's Manage original check-in section preserves Azhmen's Edit/Delete actions on mood entries. Gihani owns the history presentation and separate Mood Reflection CRUD on `mood_reflections`; Gihani services never edit/delete `mood_entries`. See [mood ownership](mood-ownership.md) for the boundary.

Chat is real-time student-counselor chat using Firestore. Azhmen owns Create/Read on `chat_threads/{threadId}/messages`, with optional Update/Delete restricted to personally sent messages. See [live chat setup](live-chat.md) for counselor provisioning, schema, rules, and testing. Former private bot messages are not shared.

## Firebase setup

1. Keep the existing six `EXPO_PUBLIC_FIREBASE_*` variables in `.env`, enable Email/Password authentication, and create Cloud Firestore.
2. Review `firestore.rules`, then publish it using Firebase console → Firestore Database → Rules. These rules include own-profile creation/read for the existing login flow. Merge with any existing project rules if needed, removing broad test-mode grants: matching allow rules are additive. Client checks alone do not enforce ownership.
3. Each account needs its existing `users/{uid}` profile with role `student` or `counselor`. Self-registration permits either role as in the current app; this does not grant access to other students' records. Live chat requires an admin-provisioned directory entry matched to a real counselor Auth account.
4. Mood and live chat require no custom index. Live chat needs counselor_directory entries before students can start a conversation. Replace campus/emergency/trusted-contact placeholders with verified institution-specific information when available.

## Manual acceptance checks (requires a configured Firebase project)

- Sign in as a student. Create each mood, with and without a note. Confirm whitespace is trimmed and timestamps/score/UID appear in Firestore.
- Open history: newest first, note and local date/time visible. Edit an entry, confirm changes and unchanged `createdAt`. Cancel deletion once, then confirm deletion and verify it disappears.
- Follow live-chat.md for two-account testing: send as student, reply as assigned counselor, receive both live, and confirm persistence after reload. Empty/whitespace messages must not send.
- With a second student account, verify the first student's moods/messages are absent. Attempt a known foreign mood edit URL; access must be denied. Signed-out student URLs redirect to login; counselor URLs redirect to the dashboard.
- Test denied rules/network errors, empty collections, and logout. Crisis support contains no fabricated telephone numbers and offers a route back home.

Only Azhmen's requested scope is implemented. Mood history is the read interface for Mood CRUD; no separate analytics, appointments, saved resources, availability, or session CRUD is added.
