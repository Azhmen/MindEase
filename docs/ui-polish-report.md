# MindEase frontend polish

## Design direction

Calm campus wellbeing presentation: warm off-white pages, deep green headings and primary actions, white cards, soft mint and occasional pale blue secondary surfaces. Reduced nested cards, heavy timeline borders, decorative whitespace and oversized controls. Content stays mobile-first with a shared maximum width of 430px.

## Typography and shared UI

One Expo-safe system sans-serif stack now serves body and heading text (System on iOS, sans-serif on Android, system-ui on web). Removed the serif editorial heading treatment. No font or other packages were added during this polish pass. Ionicons remains the functional icon library.

Added `src/constants/ui.ts` for page, card, button, input and heading tokens. Updated existing shared components rather than adding parallel implementations: AppCard, AppTextInput, PrimaryButton, StudentFrame/StudentScreen, CounselorFrame, CareButton, StatusChip, EmptyState, FeatureBanner, ActionTile, FormPanel, StepRail and AppointmentSummary.

Inputs have consistent labels and shapes; existing focus and validation behavior remains. Primary actions are approximately 50px tall and compact actions approximately 40px. Cards use soft shadows and rounded corners. Bottom navigation retains its destinations, active states and labels with consistent Ionicons sizing.

## Screen coverage

Significant presentation improvements: login/registration, student and anonymous home, mood check-in, appointment list/summary/booking confirmation, resources and saved resources, student/counselor profiles, counselor dashboard and chat inbox.

Lighter polish: Mood Rhythm and compact reflection logs, anonymous mood history, booking/edit/pre-session forms, resource details, live chat, crisis support, support/privacy, availability forms/list and counselor session list/details. These inherit the same shell, typography, controls and status styling. Existing empty, loading, error and success states were reviewed through the shared components.

## Files changed during this polish pass

Theme/layout:

- `src/constants/ui.ts` (new)
- `src/constants/colors.ts`
- `src/constants/spacing.ts`
- `src/constants/typography.ts`
- `src/constants/care-layout.ts`

Shared presentation:

- `src/components/app-card.tsx`
- `src/components/app-text-input.tsx`
- `src/components/primary-button.tsx`
- `src/components/student-ui.tsx`
- `src/components/student-screen.tsx`
- `src/components/counselor-ui.tsx`
- `src/components/wellness-ui.tsx`
- `src/components/presentation.tsx`
- `src/components/auth-screen.tsx`
- `src/components/care-login-layout.tsx`
- `src/components/mood-form.tsx`
- `src/components/mood-option-card.tsx`
- `src/components/appointment-ui.tsx`
- `src/components/appointment-screens.tsx`
- `src/components/counselor-management-screens.tsx`
- `src/components/availability-date-picker.tsx`
- `src/components/chat-ui.tsx`
- `src/components/live-chat-screen.tsx`
- `src/components/crisis-support-content.tsx`
- `src/components/resource-screens.tsx`
- `src/components/gihani-ui.tsx`

Routes (presentation only):

- `src/app/index.tsx`
- `src/app/student/home.tsx`
- `src/app/student/mood/history.tsx`
- `src/app/student/profile.tsx`
- `src/app/student/support.tsx`
- `src/app/anonymous/home.tsx`
- `src/app/anonymous/mood/history.tsx`
- `src/app/counselor/dashboard.tsx`
- `src/app/counselor/chats.tsx`
- `src/app/counselor/profile.tsx`
- `src/app/counselor/support.tsx`

Verification: updated `scripts/render-student-previews.cjs`, generated the preview manifest/HTML files in `artifacts/student-previews`, and screenshots/layout results in `artifacts/ui-polish`. Temporary build and browser tools are under `tmp`. Earlier icon/reminder/Mood Rhythm work and pre-existing app configuration changes are separate from this pass.

## Preservation and verification

All 32 snapshotted service, hook, utility, Firebase configuration and Firestore rules files remain byte-for-byte unchanged. No schema, collection, authentication, role, CRUD ownership, notification scheduling, appointment, chat or reminder behavior was changed. No production fixture data was introduced. Existing navigation destinations remain unchanged.

Service regression checks passed for student/anonymous mood and chat, appointments and pre-session notes, counselor ownership, reflections/resources and reminder notifications. Profile and reminder UI regression checks also passed. TypeScript, uncached Expo lint, web export and Android/iOS Hermes exports passed. The final all-platform export produced 47 web routes.

Browser checks covered 70 actual component/route preview states at 320px and 430px (140 layouts), with no detected horizontal overflow or clipped leaf content. These previews use isolated test fixtures, not a signed-in live Firebase session. Representative screenshots were reviewed for hierarchy, alignment and navigation/composer placement.

Physical Android and iOS verification remains necessary for native safe areas, keyboard/composer interaction, date/time pickers, large accessibility font settings and final installed-build appearance. End-to-end signed-in live-data flows were not exercised by the fixture browser checks.
