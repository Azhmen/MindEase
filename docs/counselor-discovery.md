# Dynamic counselor discovery

Booking and registered/anonymous live support use realtime counselor_directory queries with active == true. Optional bookingAvailable/chatAvailable false disables discovery for that feature; absent flags preserve the enabled default. Specialization is displayed; legacy specialty remains a display fallback. No counselor names or UIDs are embedded in production code.

Booking combines the directory with published counselor_availability snapshots. Counselors without a future slot remain visible as Currently unavailable. The date/time picker filters slots by the selected counselor's UID, isAvailable, and future start time, and updates in realtime. Availability ownership remains Kiyathan's; appointment/note writes remain Tharukanan's.

After the user's private counselor profile exists, registration/login/restored dashboard setup runs an idempotent transaction. It creates a missing own directory with public name/title/specialization, active true, bookingAvailable true, chatAvailable true, and a server updatedAt. Existing records are left unchanged, including active false and availability opt-outs. It does not create missing private user profiles on login or guess a role. Students and anonymous accounts cannot create directory entries.

The rules grant only own counselor directory creation with exactly these fields, matching the existing private profile and timestamp. Existing update rules still allow synchronized public name/title/specialization only. Owners cannot reactivate, alter feature availability flags, write private fields, create another user's membership, or delete directory entries. New appointment/chat creation also enforces active true and the respective optional feature flag. Other ownership and collection permissions are unchanged.

This requested policy enables self-registered counselor roles automatically; it is not a professional credential verification process. Existing admin-disabled records remain disabled. For a verified-campus deployment, counselor role provisioning should be administrator-controlled separately.

Deployment: publish the reviewed firestore.rules in the correct Firebase project before distributing a new APK. No production records are seeded by tests. An account created only in Firebase Authentication still needs its valid users/{UID} counselor profile. Legacy directories without active true remain hidden until an administrator sets it.

Tests: scripts/test-counselor-directory.cjs exercises Sara/Maya/Nimal fixture discovery, realtime addition/deactivation, flags, correct per-counselor slots and chosen thread UIDs, provisioning idempotency, private-field exclusion, and student/anonymous isolation. scripts/test-registration-rules.cjs verifies the creation boundary in the local emulator.

Existing limitations: one registered conversation per student and one anonymous conversation per session are retained; an existing conversation keeps its immutable counselor assignment. Slot reservation remains non-atomic. No notification or reminder behavior changes.
