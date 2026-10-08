# Counselor dashboard and chat navigation

`/counselor/dashboard` uses the existing MindEase off-white/green/mint tokens, rounded white cards, and 410px centered mobile frame. Long content scrolls above a counselor bottom navigation bar. The dashboard integrates Azhmen's real-time chat and Kiyathan's assigned sessions/availability.

## Dashboard sections

- MindEase / Campus Care header with profile avatar; counselor name is read from the signed-in user's own Firestore profile on focus. Names with Dr./Counselor prefixes are preserved; other names get the Counselor label. No doctor qualification or counselor name is fabricated.
- A Signed in badge reflects authentication, without claiming duty hours or online availability.
- Local-time morning/afternoon/evening greeting and readable current date.
- Mint Today / Virtual / Available summaries use assigned non-cancelled sessions today, active virtual sessions today/upcoming, and future available slots. Loading/error counts show a dash.
- The soft-blue Drop-in Chat Queue shows the assigned thread count and up to two recent previews from real-time chat listeners. Loading, error/retry, and empty states are explicit. No unread status is claimed because read receipts are not implemented.
- Today's Sessions shows real assigned non-cancelled appointments or No sessions scheduled. View All Sessions opens /counselor/sessions. Student labels remain generic; private profiles are not exposed.
- Quick Clinical Tools includes Box Focus Time / Mindful Break (Coming soon), Emergency Escalation Protocol (links to crisis information only), and Switch to Student Portal View (Coming soon; does not bypass role protection). Only the crisis information card uses red alert accents.
- Recent Chats lists at most two assigned conversations inside the queue, newest first, with preview/time and direct conversation navigation. Anonymous conversations show Anonymous Student without exposing their UID/session ID. Authenticated students show Student conversation because existing rules do not permit counselors to read another user's private profile.
- Existing logout is retained.

## Routes

Dashboard and Chats are functional. `/counselor/chat/[threadId]` remains the existing conversation screen; guest threads retain the `anonymous=true` parameter and use the existing anonymous chat service.

`/counselor/schedule` redirects to /counselor/availability; Schedule opens real availability CRUD. /counselor/profile supports own counselor profile editing and public-directory synchronization; see counselor-profile.md. `/counselor/crisis-support` reuses the student/guest crisis content inside the counselor shell, with no new phone numbers or contact claims.

The Home / Schedule / Messages / Profile bottom navigation appears on the dashboard, inbox, and counselor supporting screens. The conversation keeps its compact composer and existing back-to-Chats action.

## Architecture and security

`useCounselorThreads()` combines the existing `subscribeToCounselorThreads()` functions from authenticated and anonymous chat services. Dashboard and inbox share this hook and route builder; it is not a second Firestore service. Both lists must load before reporting a complete count; listener failures clear stale previews and show retry. Listeners clean up on unmount/reconnect.

The existing counselor RoleLayout still requires a restored, non-anonymous Firebase account with a counselor user profile. Chat/mood services, message operations and student/anonymous role routing remain unchanged. Scheduling uses separate counselor-management services and scoped Firestore grants. Existing counselor directory provisioning and published chat rules remain prerequisites for chat access. Publish the scheduling rules; see docs/kiyathan-features.md.

## Verification

Run `npm run lint`, `npx tsc --noEmit`, `npx expo export --platform web`, `npm run test:services`, and `node scripts/render-student-previews.cjs`.

Rendered fixtures cover zero/one/multiple assigned chats, loading/error states, the recent-chat limit, dynamic counselor name, and absence of anonymous identity in dashboard/inbox output. Service tests cover authenticated/guest send/reply, own edit/delete, live updates, persistence, and ownership rejection. Fixtures/mock tests do not replace real Firebase or interactive browser acceptance.

Manual acceptance: counselor login → Dashboard → Open Queue → student/anonymous conversation → reply → edit own reply → delete own reply. Return to Dashboard and check the preview/count. Verify Schedule opens availability and Profile loads and edits your own counselor profile, Crisis Support returns to Dashboard, logout works, and 320–410px layouts scroll without horizontal overflow. No browser was available for this session's interactive acceptance.


Kiyathan scheduling integration: see docs/kiyathan-features.md for current real availability reads, counselor session status controls, and the read-only slot-selection limitation. Earlier demo/coming-soon scheduling descriptions are superseded. Other CRUD ownership remains unchanged.

## Support Options
/counselor/support is informational UI under the existing counselor role guard. Profile ? Help & Support ? Support Options opens it. The screen reuses the 410px counselor frame, MindEase/Campus Care header, Campus Wellness Network badge, searchable support cards, trending topic filters and bottom navigation. Technical Support, Platform Guide, Counseling Resources, Contact Admin and FAQ expand to brief local guidance. Crisis support links to the existing information route; no administrator contacts are invented. No Firestore data, rules, CRUD allocations or scheduling/chat services change.
