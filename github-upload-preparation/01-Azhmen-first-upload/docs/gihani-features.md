# Gihani: Mood History, reflections and saved resources

## Allocation and routes
Azhmen owns every create/read/update/delete operation on mood_entries and the live-chat feature. Gihani owns Mood History presentation and CRUD on separate mood_reflections and saved_resources documents. Tharukanan appointment/note services and Kiyathan's availability/session features are not changed.

Routes:
- /student/mood/history: own mood entries, newest first, icons/notes/timestamps, attached reflection and reflection actions.
- /student/resources: search, twelve category filters, featured resources and Save.
- /student/resources/saved: own saved items, favorites, personal notes and confirmed removal.
- /student/resources/[id]: short content summary and Save/Saved status.

Existing Home | Mood | Resources | Profile navigation is reused. Student Home is unchanged; the existing Resources tab already points to the upgraded route.

## Mood reflection CRUD
mood_reflections/{moodEntryId} fields: userId, moodEntryId, reflection, createdAt, updatedAt.
The reflection ID equals the globally unique mood entry ID, so one check-in has at most one reflection.
Create/Edit require a student's existing own mood entry. Text is trimmed, required and limited to 1,000 characters. Edit changes only reflection and updatedAt. Delete is confirmed, deletes only mood_reflections, and leaves the original mood/note unchanged. The existing mood service is not imported for mutations by Gihani's services.

The history card's separate **Manage original check-in** section preserves Azhmen's pre-existing Edit/Delete demo controls. Those actions still use Azhmen's original service. Reflection load errors do not disable original check-in controls. Deleting an original mood entry through Azhmen's controls does not cascade to reflection data; such orphan reflections remain private. The reflection service/rules permit their owner to delete them, without changing original Mood CRUD.

## Resource source
resources/{resourceId} fields: title, description, category, optional duration/type/summary/imageUrl/featured, active.
Resources are read-only to clients and may be seeded in Firebase Console/Admin SDK. The UI uses text and existing icons; imageUrl is not rendered.
When the Firestore resources collection is completely empty, an original twelve-item local starter dataset covers Academic Stress, Exam Anxiety, Sleep, Focus, Procrastination, Social Anxiety, Mindfulness, Grounding, Burnout, Time Management, Homesickness and Self-Confidence. This is explicitly labeled a starter library and is not written to Firestore. If any Firestore resource records exist, the library uses active, valid Firestore records only. An inactive-only catalog shows an empty state. Network/permission failures are shown, never disguised as a local fallback.
Previously saved starter IDs remain readable from the bundled guidance when no Firestore document with that ID exists. A deactivated Firestore override is respected and never replaced by a starter fallback.

## Saved resources CRUD
saved_resources/{userId}_{resourceId} fields: userId, resourceId, personalNote, favorite, savedAt, updatedAt.
New saves use deterministic IDs and a transaction to prevent duplicates. Existing own saves with older random IDs are reused rather than duplicated. Create initializes favorite false and personalNote empty. All write timestamps use serverTimestamp.
Read filters by current UID, newest saved first. Favorite toggles true/false and updates updatedAt. Personal notes are trimmed and limited to 1,000 characters; blank text clears the note. Updates preserve userId, resourceId and savedAt.
Remove uses confirmation, resolves records by current userId + resourceId, and deletes their actual saved document IDs (including older random IDs/duplicates). Repeated removal is safe. Successful Save and Remove update screen state immediately, without a list reload. Original resources remain unchanged. Saved records for unavailable resources retain their favorite/personalNote and can still be removed. A failed catalog-detail lookup shows a per-card error instead of hiding all removal controls; known starter content may be displayed from the bundle with that error visible.

Search matches titles, descriptions, categories and summaries case-insensitively and combines with the category filter. Featured items use featured true, with a small first-items selection if none are marked. Content remains short original guidance.

Existing records from the earlier saved schema are read with their old text as personalNote and favorite false. On the next note/favorite edit, the transaction preserves userId/resourceId/savedAt, writes the exact new schema and removes obsolete fields. No destructive reset or manual migration is required.

## Security and manual Firebase setup
Publish updated firestore.rules before using the new collections. Existing users/mood/chat/appointments/pre_session_notes blocks are preserved. New rules enforce student role and per-user ownership, immutable IDs/timestamps, own linked mood for reflection create/update, and personalNote/favorite validation. resources permits authenticated reads and denies client writes. No counselor/anonymous access to private reflections or saved items is added.
Private saved-resource grants validate ownership, exact fields and immutable references, without requiring a resources document or a duplicated starter-ID whitelist. The client verifies non-starter resources are available; bundled starter saves need no catalog read. Bookmarking never grants writes to original content. Legacy random-ID records may be updated by their owner; newly created records must use the deterministic ID.
Firestore indexes are not required beyond automatic single-field indexes; user queries filter by userId and sort locally. Collections are created by the first writes. Optional resource seeding is console/Admin SDK only: provide title, description, category, active true and optionally duration, type and a short original summary. No new Auth providers, migration or resource-management CRUD is required.

## Verification
Run npm run lint, npx tsc --noEmit, npx expo export --platform web.
Service tests: node scripts/test-gihani-services.cjs, npm run test:services, node scripts/test-appointments.cjs.
Fixtures: node scripts/render-student-previews.cjs.
Mocks verify reflection CRUD/reload/ownership and unchanged original mood; saved CRUD/idempotency/personal-note/favorite/legacy-upgrade/reload and unchanged original resources; Firestore/starter/empty/error source behavior and role checks. Fixtures exercise reflection viewing/edit/deletion, resource search/category/featured/list/detail/saved/favorite/note/removal and empty/error states, alongside existing screens.

Optional real rule tests:
npx firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-mindease "node scripts/test-gihani-rules.cjs"
Requires the Firestore emulator/Java. Mock tests do not verify deployed rules.

Manual acceptance after publishing: log in as student, add/edit/delete a reflection, reload after saves and confirm the mood remains. Save a resource twice, view Saved, toggle favorite, add/edit/clear a personal note, reload, then remove and confirm the original remains. Test a second student cannot access known foreign IDs, and repeat Mood, live-chat and appointment acceptance. Interactive Firebase/browser and emulator rule tests were not available in this session.

## Saved Resources debugging fix
Modified: src/services/saved-resources.ts, src/components/resource-screens.tsx, firestore.rules, scripts/test-gihani-services.cjs, scripts/test-gihani-rules.cjs and this document. Added src/utils/saved-resource-errors.ts and scripts/test-saved-resource-flow.cjs. No route or source-resource schema changes; no display fields were added to saved_resources.

Identified failure paths: Save unnecessarily re-read the catalog even for bundled content, while rules coupled private bookmark creation to a separate catalog/ID whitelist. The Saved screen loaded every referenced resource before rendering any cards, so one failed detail lookup prevented access to Remove. Save/list removal relied on re-fetching state. Existing deterministic IDs and current six-field schema were already correct. These findings do not prove which Firebase error occurred in the deployed project; no deployed error code or authenticated browser test account was available.

Save/remove errors log the original FirebaseError in development and show contextual readable UI errors. Old completed/completedAt/reflection fields are used only by backward-compatible reading/migration; new writes use personalNote/favorite.

Verification: test-gihani-services.cjs covers catalog-independent starter saves, failed writes/errors, duplicate saves, legacy random IDs, removal persistence and student isolation. test-saved-resource-flow.cjs invokes the actual resource-screen handlers and services with mocked widgets/Auth/Firestore, covering Save-to-Saved, saved listing/reload, confirmed removal, detail returning to Save, original resource preservation, catalog lookup failures, visible errors and library state updates. These tests are not a real Firebase/browser or deployed-rules acceptance test.

Republish firestore.rules before testing the deployed app. No data deletion or reseeding is required. The Firestore emulator binary is not installed locally; scripts/test-gihani-rules.cjs is ready for emulator enforcement testing.

## Saved card state synchronization
The Saved Resources screen's items array is the single display source for saved documents. After a successful personal-note/favorite write, its card updates that parent record directly rather than scheduling a list reload. The editor text is a draft only; displayed notes are trimmed and show either the note or No personal note yet. Persistent resource action success text was removed; updated content/buttons confirm the action. Removal still filters the parent list immediately. Resource detail and browse screens reload current saved state on navigation focus, so returning after removal shows Save Resource/Save without a browser refresh. Firestore fields, rules and service ownership are unchanged.

The screen-interaction regression tests verify add/edit/clear note and favorite/unfavorite with saved-list reloading deliberately blocked, plus confirmation/removal and detail returning to Save Resource.
