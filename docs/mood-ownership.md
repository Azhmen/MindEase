# Mood assignment ownership

| Owner | Responsibility | Collection |
| --- | --- | --- |
| Azhmen | Mood Check-in create/read/update/delete | mood_entries |
| Azhmen | Real-time student-counselor chat; optional own-message editing/deletion | chat_threads/{threadId}/messages |
| Gihani | Mood History presentation + Mood Reflection CRUD | mood_reflections |
| Gihani | Self-help resource browsing + Saved Resources CRUD | resources (read only), saved_resources |

/student/mood/history renders Mood Rhythm from `src/app/student/mood/history.tsx`: real weekly latest-per-day moods, range-filtered logs, distinct-day mood frequency and an active daily streak. Weeks run Monday–Sunday in device local time; Month means the current calendar month. Frequency follows the selected range; streak spans all entries and may end today or yesterday. Missing timestamps are shown only in All Time and excluded from date statistics.

Gihani's history reads mood_entries and displays compact mood_reflections previews. Add/edit/delete reflection actions open a modal and use only Gihani's reflection service. Each log's overflow opens Azhmen's existing `/student/mood/edit/[id]` route, where original check-in edit/delete controls now live. History has no original-entry mutation controls or service calls.

mood_reflections/{moodEntryId} stores userId, moodEntryId, reflection, createdAt and updatedAt. A single reflection is linked to an existing own mood entry. Reflection edits preserve identity and creation time. Reflection deletion never deletes or updates mood_entries.

Gihani's services may read mood_entries for ownership validation, but never write to them. Original entry deletion through Azhmen's controls does not cascade to reflections; orphan reflection records remain private and may be deleted by their owner. This preserves Azhmen's original Mood CRUD behavior.

See [Gihani's feature documentation](gihani-features.md) for resource schema, rules, Firebase setup and verification. Publish the new rules to enable reflection/saved-resource access; existing Mood and Chat rule blocks are unchanged.
