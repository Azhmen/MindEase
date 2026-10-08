# Azhmen's student flow and visual system

Login → Student Home. Existing registration, login, role routing, profile storage, Firebase initialization, and logout use their original services. Tharukanan's booking features and Gihani's reflection/resource features are documented separately.

Home reads the current user's name and mood entries, shows the most recent mood created on the user's local day, and refreshes on focus. Retake creates a new entry; it does not overwrite history. Box Breathing, Quick Unwind, and Mindful Walking are static cards, with no backend or activity tracking.

## Navigation

- Home → `/student/mood` → Save Check-in → `/student/mood/history`.
- History → Edit → `/student/mood/edit/[id]` → Save Changes → History.
- History → Delete → inline confirmation → remove only that user's entry.
- Home → Chat Now → `/student/chat` → Live Support → real counselor conversation.
- Home → Crisis Support → `/student/crisis-support` → Back to Home.
- Shared bottom navigation: Home | Mood | Resources | Profile. Resources opens Gihani's categorized library, saved resources and resource details. Profile reads the existing account, provides logout and links to My Appointments; profile-editing CRUD is not added.

Gihani owns the history presentation and separate `mood_reflections` CRUD. Manage original check-in preserves Azhmen's `mood_entries` Edit/Delete demo controls. Reflection deletion leaves the original check-in unchanged. See [ownership](mood-ownership.md) and [Gihani features](gihani-features.md).

## Presentation

`student-ui.tsx` contains StudentFrame, StudentHeader, StudentBottomNav, StudentCard, CareButton, and shared text styles. StudentFrame is centered at a maximum width of 430px on web and uses full width on native. Scroll containers shrink to available space without fixed page heights. Chat keeps its composer below a scrolling conversation. The shared shell preserves safe areas and bottom navigation.

The design uses existing careBackground/careGreen/carePale/careBorder tokens, rounded cards, and CareIcon vector icons. MoodOptionCard/MoodFace and MoodForm are reused for create/edit; ChatHeader/ChatBubble/SuggestedReply handle the live conversation layout. New notes are limited to 200 characters. Older saved notes up to the existing 500-character service limit remain editable without truncation. Touchpoints are optional reflection controls and are explicitly not persisted.

No new Figma images or links were attached to this task. This implementation follows the described reference hierarchy and the existing MindEase branding; exact comparison to the original reference assets requires those assets.

## Firestore

- `users`: existing profiles, unchanged rules and auth flow.
- `mood_entries`: existing create/read/update/delete services, values, ownership, timestamps, and rules unchanged.
- `chat_threads` with nested `messages`: real-time student-counselor chat using Firestore, restricted to assigned participants. `counselor_directory` lists verified real counselor accounts. See live-chat.md for setup and Create/Read services.

Publish the updated firestore.rules manually. Chat rules enforce assigned participants, sender UID/role, timestamps, and immutable assignments. Mood/users rules remain unchanged. Provision verified counselor_directory entries. Campus/emergency information remains a placeholder until verified institutional details are available; no phone numbers were invented. No database migration or deletion is necessary.

## Testing and limits

`node scripts/test-student-services.cjs` exercises actual services with a mock Firestore boundary: mood CRUD/ordering/ownership, two-way live messages, atomic thread previews, participant checks, reload reads, chronological order, and listener cleanup. These tests do not verify deployed Firebase rules or live network persistence.

`node scripts/render-student-previews.cjs` renders real student/guest/counselor components with fictional data to artifacts/student-previews for isolated layout review, including reflection/resource and booking states. `--serve` serves these fixtures at localhost:8090. They are static previews, not authenticated app routes; no test data or authentication bypass is added to the application. Live browser interaction was unavailable in this session.

For live acceptance, use a Firebase student account to create a mood, reload history, edit it, cancel deletion once, then confirm deletion. Follow live-chat.md to test student/counselor messages in separate sessions and persistence after reload. Use a second account to verify isolation. Test Home/Mood/Chat/Crisis/Resources/Profile navigation, logout, and 320–430px layouts with keyboard open. Run npm run lint, npx tsc --noEmit, and npx expo export --platform web.
