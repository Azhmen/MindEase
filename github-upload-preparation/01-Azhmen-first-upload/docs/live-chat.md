# Real-time student-counselor chat using Firestore

Azhmen owns message Create (send) and Read (live conversation), plus optional Update/Delete of personally sent messages. No automated replies, attachments, appointments, sessions, or availability CRUD is included. Existing authentication, Mood CRUD, ownership allocation, and Crisis Support remain intact.

## Optional own-message Update/Delete

Anonymous students use separate anonymous_chat_threads with the same chat UI. Assigned guest conversations appear as Anonymous Student in the counselor inbox. See [anonymous mode](anonymous-mode.md) for schema, security, and setup.

Own bubbles show a three-dot action control with Edit and Delete. Edit opens a text input with Save/Cancel; trimmed text must contain 1–2,000 characters. `updateOwnMessage()` changes only `text`, `edited: true`, and `updatedAt` (server timestamp). Original sender fields and creation time remain unchanged. The timestamp displays an edited label. Delete requires explicit confirmation with Cancel/Delete; `deleteOwnMessage()` permanently removes the document and listeners update both conversations.

Both services check authenticated profile, thread membership, and message ownership inside a transaction. Rules independently enforce ownership and immutable fields. Transactions compare the original creation timestamp/text with the thread preview, preventing concurrent new sends from losing their preview. Editing the latest message changes preview text; deleting it uses "Message deleted". Preview time stays at the original send time. Older messages do not change the preview. No migration is required for existing messages without edit metadata. Republish firestore.rules before using these actions.

## Firestore structure

`chat_threads/{studentUid}` stores `studentId`, `counselorId`, `createdAt` (server timestamp), `lastMessage` (initially empty), and `lastMessageAt` (initially null, then server timestamp).

One stable thread per student prevents duplicate threads across devices. `createOrGetChatThread()` uses a transaction and never replaces an existing assignment. Existing real counselor threads from earlier versions are reused.

`chat_threads/{threadId}/messages/{messageId}` stores `senderId` (authenticated UID), `senderRole` (`student` or `counselor` from the user's profile), trimmed `text` (1–2,000 characters), and `createdAt` (server timestamp). Document IDs supply `id` when reading. `sendMessage()` batches each message with the thread preview update, so they succeed or fail together.

`counselor_directory/{counselorUid}` stores `name` (required string), optional public `title`, and optional boolean `active`. Omitted active means true; false stops new assignments. Directory availability is not online presence. The app uses Active counselor and explains replies may take time; it does not claim a counselor is logged in. Inactive counselors can continue existing assigned conversations. Removing their directory membership revokes counselor chat access.

Directory membership is admin-maintained; clients cannot create or update it. Only public display details belong here. Actual counselor UIDs must be verified against Firebase Authentication and users profiles.

## Student flow

Open `/student/chat`. A real-time own-thread listener reopens any existing conversation immediately. With no thread, Live Support shows Talk to a Counselor, directory availability, Start Live Chat, and Crisis Support.

Start Live Chat refreshes the directory: exactly one active counselor is auto-assigned; several counselors show a picker; none shows an unavailable state with support options. The selected UID is checked before creating the thread. Suggested replies only fill the composer; Send sends ordinary text to the real counselor.

## Counselor flow

The existing dashboard links to `/counselor/chats`. Its live inbox shows assigned student threads, latest messages/times, and Open Conversation. `/counselor/chat/[threadId]` subscribes to the same thread/messages as the student. Both participants can send and receive without refresh. Student UID is shown without granting counselor access to private student profiles.

ChatHeader, ChatBubble, and SuggestedReply are reused with the existing theme and 430px web shell. Own messages appear right; other messages appear left. Loading/empty/error/reconnect states are included. Subscriptions are cleaned up on unmount/reconnect. Existing role layouts restore authentication and validate stored roles.

## Manual Firebase setup

1. Keep existing Firebase environment variables, Email/Password Authentication, and Firestore.
2. Register a real counselor account using the existing app flow. Verify its actual UID in Firebase Authentication and confirm `users/{uid}.role` is `counselor`.
3. In Firestore console create `counselor_directory/{that exact Auth UID}` with `name`, optionally `title`, and a boolean `active: true`. Repeat for multiple counselors to test the picker. Directory writes are console/Admin SDK only. Choosing counselor role at signup alone does not grant private chat access.
4. Review and publish `firestore.rules` in Firestore Database → Rules. Remove overlapping broad test-mode grants. New threads validate counselor directory membership, active status, and counselor profile role. Reads/writes require the correct assigned participant and sender UID/role. Timestamps/text are validated, and assignments remain immutable; message updates/deletes require the original sender. Users and mood_entries rules remain unchanged.
5. Sign in as a student to start the conversation. Default Firestore single-field indexes are sufficient; no custom composite index is needed. No hardcoded UID or external AI API key is used.

Legacy `chat_messages` and old top-level messages remain stored remotely but are not used, displayed, migrated, or granted client access by these rules. Private former bot messages are not automatically shared with a counselor. No database deletion is required.

## Verification

Run `node scripts/test-student-services.cjs`, `npm run lint`, `npx tsc --noEmit`, and `npx expo export --platform web`. Mock service tests cover preserved Mood CRUD, active-directory filtering, stable thread creation, two-way live messages/inbox previews, sender roles, atomic failure, unassigned-user rejection, reload persistence, and cleanup. They do not validate deployed rules or live Firebase networking.

For live acceptance, use two browser profiles/incognito sessions or devices:

1. Publish rules and provision directory/account records. Student logs in, opens Live Support, starts chat, and sends a message.
2. Assigned counselor logs in separately, opens Chats, sees the preview, opens the conversation, and replies.
3. Confirm student receives the reply without refresh; send the next student message and confirm counselor receives it live.
4. Refresh both pages and confirm the thread/messages persist.
5. A second student/counselor must not access an unassigned thread, including by URL. Each participant can edit/delete their own messages only; both directions of editing/deleting the other participant's message must be denied. Forged sender IDs/roles and assignment changes must be denied.
6. Test one-counselor auto-assignment, multi-counselor picker, empty/inactive directory, blank/long text, errors/reconnect, logout, and navigation back to Home/Chats.

Live two-account Firebase acceptance remains unverified in this session because authenticated student/counselor browser sessions are not available. Campus Crisis Support remains unchanged and informational.

