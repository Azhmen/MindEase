# MindEase final Git/member ownership

Updated 2026-10-08. This replaces the previous staged-overlay instructions. Canonical working application files are the source of truth. No push, branch mutation, reset, rebase or app change is performed by preparation.

## Existing structure and safe use

`01-Azhmen-first-upload` contains 155 current Azhmen, Shared/Common and Integration files. It is the shared first-upload base; combine it with the Tharukanan (20), Gihani (16) and Kiyathan (16) overlays to assemble all 207 current project files. The four existing folders were cleared of old copied contents and refreshed from the real project. Shared tests are only in the first-upload folder; no legacy test or booking-utility copies remain in other member folders. `.env` is never copied.

`manifest.json` is the machine-readable source of truth and records SHA-256 hashes, active package entries, retained legacy entries, and cross-owner imports. The existing `prepare.py` describes the earlier Git-preparation workflow and should not be run for a folder-only refresh, because it invokes Git and rebuilds the complete-source first-upload snapshot. This refresh used current manifest ownership only, performed no Git commands and created no new member folder.

Only local `main` exists at inspection (initial commit 2f236e1); no remote is configured. The old guide named https://github.com/Azhmen/MindEase, which is not a configured remote. Proposed branches: `main`, `member/azhmen`, `member/tharukanan`, `member/gihani`, `member/kiyathan`. Shared/Common and Integration changes belong on main.

## 1. Azhmen

```text
src/app/anonymous/_layout.tsx
src/app/anonymous/chat.tsx
src/app/anonymous/crisis-support.tsx
src/app/anonymous/home.tsx
src/app/anonymous/mood.tsx
src/app/anonymous/mood/edit/[id].tsx
src/app/anonymous/mood/history.tsx
src/app/counselor/chat/[threadId].tsx
src/app/counselor/chats.tsx
src/app/counselor/crisis-support.tsx
src/app/student/chat.tsx
src/app/student/crisis-support.tsx
src/app/student/mood/edit/[id].tsx
src/app/student/mood/index.tsx
src/components/anonymous-exit-button.tsx
src/components/chat-ui.tsx
src/components/crisis-support-content.tsx
src/components/live-chat-screen.tsx
src/components/mood-form.tsx
src/components/mood-option-card.tsx
src/components/student-live-support.tsx
src/hooks/use-counselor-threads.ts
src/services/anonymous-chat.ts
src/services/anonymous-mood.ts
src/services/anonymous-session.ts
src/services/chat.ts
src/services/mood.ts
src/utils/crisis-cues.ts
```

## 2. Tharukanan

```text
src/app/student/(booking)/_layout.tsx
src/app/student/(booking)/appointments.tsx
src/app/student/(booking)/appointments/book.tsx
src/app/student/(booking)/appointments/confirm.tsx
src/app/student/(booking)/appointments/edit/[id].tsx
src/app/student/(booking)/appointments/pre-session.tsx
src/app/student/(booking)/appointments/success.tsx
src/components/appointment-reminder-banner.tsx
src/components/appointment-reminder-provider.tsx
src/components/appointment-reminder-status.tsx
src/components/appointment-screens.tsx
src/components/appointment-ui.tsx
src/components/booking-draft.tsx
src/components/notification-preferences.tsx
src/services/appointment-reminders.ts
src/services/appointments.ts
src/services/pre-session-notes.ts
src/services/reminder-notifications.native.ts
src/services/reminder-notifications.ts
src/utils/appointment-reminder-plan.ts
```

## 3. Gihani

```text
src/app/student/mood/history.tsx
src/app/student/resources.tsx
src/app/student/resources/[id].tsx
src/app/student/resources/saved.tsx
src/components/gihani-ui.tsx
src/components/mood-log-card.tsx
src/components/mood-reflection-panel.tsx
src/components/resource-screens.tsx
src/constants/starter-resources.ts
src/services/gihani-session.ts
src/services/mood-reflections.ts
src/services/resources.ts
src/services/saved-resources.ts
src/utils/mood-rhythm.ts
src/utils/resource-search.ts
src/utils/saved-resource-errors.ts
```

## 4. Kiyathan

```text
src/app/counselor/availability.tsx
src/app/counselor/availability/edit/[id].tsx
src/app/counselor/availability/new.tsx
src/app/counselor/profile.tsx
src/app/counselor/schedule.tsx
src/app/counselor/session/[id].tsx
src/app/counselor/sessions.tsx
src/app/counselor/support.tsx
src/components/availability-date-picker.native.tsx
src/components/availability-date-picker.tsx
src/components/availability-picker-ui.tsx
src/components/availability-time-picker.tsx
src/components/counselor-management-screens.tsx
src/hooks/use-counselor-schedule.ts
src/services/counselor-management.ts
src/utils/availability-form.ts
```

## 5. Shared/Common

```text
.env.example
.gitignore
.vscode/extensions.json
.vscode/settings.json
AGENTS.md
LICENSE
README.md
app.json
assets/expo.icon/Assets/expo-symbol 2.svg
assets/expo.icon/Assets/grid.png
assets/expo.icon/icon.json
assets/images/android-icon-background.png
assets/images/android-icon-foreground.png
assets/images/android-icon-monochrome.png
assets/images/expo-badge-white.png
assets/images/expo-badge.png
assets/images/expo-logo.png
assets/images/favicon.png
assets/images/icon.png
assets/images/logo-glow.png
assets/images/react-logo.png
assets/images/react-logo@2x.png
assets/images/react-logo@3x.png
assets/images/splash-icon.png
assets/images/tabIcons/explore.png
assets/images/tabIcons/explore@2x.png
assets/images/tabIcons/explore@3x.png
assets/images/tabIcons/home.png
assets/images/tabIcons/home@2x.png
assets/images/tabIcons/home@3x.png
assets/images/tutorial-web.png
docs/anonymous-mode.md
docs/appointment-reminders.md
docs/azhmen-features.md
docs/counselor-dashboard.md
docs/counselor-profile.md
docs/final-verification.md
docs/functional-reliability-pass.md
docs/gihani-features.md
docs/kiyathan-features.md
docs/live-chat.md
docs/mood-ownership.md
docs/registration.md
docs/student-flow.md
docs/student-profile-support.md
docs/tharukanan-features.md
docs/ui-consistency.md
docs/ui-polish-report.md
eas.json
eslint.config.js
firebase.emulator.json
firestore.rules
package-lock.json
package.json
scripts/audit-visual-preservation.cjs
scripts/render-student-previews.cjs
scripts/run-rule-regressions.cjs
scripts/test-appointment-cancellation-ui.cjs
scripts/test-appointment-notifications.cjs
scripts/test-appointment-rules.cjs
scripts/test-appointments.cjs
scripts/test-availability-delete.cjs
scripts/test-counselor-profile-rules.cjs
scripts/test-counselor-profile-screen.cjs
scripts/test-counselor-profile.cjs
scripts/test-firestore-rules.cjs
scripts/test-gihani-rules.cjs
scripts/test-gihani-services.cjs
scripts/test-kiyathan-rules.cjs
scripts/test-kiyathan-services.cjs
scripts/test-mood-log-card.cjs
scripts/test-mood-rhythm-reflections.cjs
scripts/test-mood-rhythm.cjs
scripts/test-notification-preference-rules.cjs
scripts/test-registration-flow.cjs
scripts/test-registration-rules.cjs
scripts/test-reminder-crisis-ui.cjs
scripts/test-reminder-status-ui.cjs
scripts/test-reminders-and-crisis.cjs
scripts/test-saved-resource-flow.cjs
scripts/test-student-profile-screen.cjs
scripts/test-student-profile-support.cjs
scripts/test-student-services.cjs
scripts/test-temporary-feedback.cjs
src/app/_layout.tsx
src/app/counselor/_layout.tsx
src/app/index.tsx
src/app/login.tsx
src/app/register.tsx
src/app/student/privacy.tsx
src/app/student/support.tsx
src/components/app-card.tsx
src/components/app-text-input.tsx
src/components/auth-screen.tsx
src/components/care-icon.tsx
src/components/care-login-layout.tsx
src/components/counselor-ui.tsx
src/components/logout-button.tsx
src/components/presentation.tsx
src/components/primary-button.tsx
src/components/role-layout.tsx
src/components/screen-container.tsx
src/components/student-screen.tsx
src/components/student-ui.tsx
src/components/text.tsx
src/components/wellness-ui.tsx
src/config/auth-instance.native.ts
src/config/auth-instance.ts
src/config/firebase.ts
src/constants/border-radius.ts
src/constants/care-layout.ts
src/constants/colors.ts
src/constants/spacing.ts
src/constants/student-support.ts
src/constants/typography.ts
src/constants/ui.ts
src/hooks/use-temporary-feedback.ts
src/services/auth.ts
src/services/student-session.ts
src/utils/auth.ts
tsconfig.json
```

`expo-env.d.ts` is shared/generated and intentionally not staged or packaged. Git preparation scripts, manifests, ZIPs, pathspecs, this guide and status reports under `github-upload-preparation/` are shared organization artifacts, not member-exclusive feature implementation.

## 6. Integration

```text
src/app/counselor/dashboard.tsx
src/app/student/_layout.tsx
src/app/student/home.tsx
src/app/student/profile.tsx
src/constants/booking.ts
src/services/user-profile.ts
```

- `src/app/student/home.tsx`: Azhmen mood/support, Tharukanan reminders and appointments, Gihani resource navigation.
- `src/app/student/profile.tsx`: Shared identity/profile plus Tharukanan reminder preferences and other module links.
- `src/app/student/_layout.tsx`: Shared role shell mounts Tharukanan reminder provider.
- `src/app/counselor/dashboard.tsx`: Kiyathan dashboard/schedule presentation integrates Azhmen live-chat queue. Kiyathan is presentation steward; coordinate whole-file merges.
- `src/services/user-profile.ts`: Shared profile/auth data, counselor directory, and appointment-reminder preferences.
- `src/constants/booking.ts`: Booking date/topic utilities consumed by Tharukanan booking and Kiyathan availability.

## 7. Latest modified reliability files

- `src/components/appointment-screens.tsx` → Tharukanan; refreshed source/copy/ZIP hashes verified.
- `src/components/resource-screens.tsx` → Gihani; refreshed source/copy/ZIP hashes verified.
- `src/components/counselor-management-screens.tsx` → Kiyathan; refreshed source/copy/ZIP hashes verified.
- `src/components/live-chat-screen.tsx` → Azhmen; refreshed source/copy/ZIP hashes verified.
- `src/components/mood-reflection-panel.tsx` → Gihani; refreshed source/copy/ZIP hashes verified.
- `src/components/mood-log-card.tsx` → Gihani; refreshed source/copy/ZIP hashes verified.
- `src/app/student/mood/history.tsx` → Gihani; refreshed source/copy/ZIP hashes verified.
- All `scripts/` regression and preview files → Shared/Common.

## 8. Files requiring coordinated merge

All six Integration files require coordinated review. Kiyathan is dashboard presentation steward while Azhmen owns its imported chat feature. `appointment-ui.tsx`, mood option/form components and `gihani-ui.tsx` have cross-module consumers; changes must retain imported exports. Appointment screens consume Kiyathan availability read-only; mood history reads Azhmen mood entries without taking CRUD ownership. The full dependency list is `cross_owner_imports` in the manifest. Shared theme, care-icon, role layouts, Firebase, package files and regression scripts must merge on main.

## Current Git state and exclusions

`git-status.json` records every modified/new/deleted/untracked path, including pre-existing tracked temporary-file deletions and preview modifications. These are not staged by the recommended ownership pathspecs. `.env` was already tracked: `.gitignore` does not untrack it. `git rm --cached -- .env` keeps the local file and removes it from future commits. Its historical exposure is unresolved; inspect before publishing without rewriting history automatically. The preparation never reads or prints environment values.

TypeScript and lint passed; 20 non-emulator regressions passed. Firestore-rule regressions need the Firebase emulator and are not claimed as live rule validation. Application functionality, rules and source bytes were unchanged by this task.

## Recommended commands (review before executing; not performed)

Do not use `git add .` or `git add -A`. Literal NUL pathspecs safely handle Expo route brackets/parentheses. Commit shared/integration first, then stage each canonical member subset on its branch using clean worktrees. Do not stage the complete integration snapshot as member-owned source.

```powershell
git status --short
git diff --stat
git rm --cached -- .env
git add --pathspec-from-file="github-upload-preparation/pathspecs/main.nul" --pathspec-file-nul
git diff --cached --stat
git commit -m "Prepare final shared infrastructure and integration"
```

After rechecking that member branches still do not exist, create clean worktrees from that main commit:

```powershell
git worktree add -b member/azhmen ../mindease-azhmen main
git worktree add -b member/tharukanan ../mindease-tharukanan main
git worktree add -b member/gihani ../mindease-gihani main
git worktree add -b member/kiyathan ../mindease-kiyathan main
```

Copy ONLY paths in `manifest.json` → `ownership` → the member name from this canonical workspace to its clean worktree, preserving relative paths. Verify source hashes against `source_sha256`; do not copy any `.env`, generated output, another member’s code or existing `.git` directory. Stop if a worktree is dirty or contains another member’s changes. Then:

```powershell
git -C ../mindease-azhmen add --pathspec-from-file="../mindease-expo/github-upload-preparation/pathspecs/azhmen.nul" --pathspec-file-nul
git -C ../mindease-azhmen diff --cached --stat
git -C ../mindease-azhmen commit -m "Finalize Azhmen feature implementation"
git -C ../mindease-tharukanan add --pathspec-from-file="../mindease-expo/github-upload-preparation/pathspecs/tharukanan.nul" --pathspec-file-nul
git -C ../mindease-tharukanan diff --cached --stat
git -C ../mindease-tharukanan commit -m "Finalize Tharukanan feature implementation"
git -C ../mindease-gihani add --pathspec-from-file="../mindease-expo/github-upload-preparation/pathspecs/gihani.nul" --pathspec-file-nul
git -C ../mindease-gihani diff --cached --stat
git -C ../mindease-gihani commit -m "Finalize Gihani feature implementation"
git -C ../mindease-kiyathan add --pathspec-from-file="../mindease-expo/github-upload-preparation/pathspecs/kiyathan.nul" --pathspec-file-nul
git -C ../mindease-kiyathan diff --cached --stat
git -C ../mindease-kiyathan commit -m "Finalize Kiyathan feature implementation"
```

After review, preserve current member working changes before merging their committed versions (keep the stash until verification; do not automatically drop/pop it):

```powershell
git stash push --include-untracked -m "Preserve current final member files before integration" --pathspec-from-file="github-upload-preparation/pathspecs/members.nul" --pathspec-file-nul
git merge --no-ff member/azhmen -m "Integrate final Azhmen features"
git merge --no-ff member/tharukanan -m "Integrate final Tharukanan features"
git merge --no-ff member/gihani -m "Integrate final Gihani features"
git merge --no-ff member/kiyathan -m "Integrate final Kiyathan features"
npx tsc --noEmit
npm run lint
git status --short
```

No push command is included. Existing unrelated deletions/generated outputs remain untouched and unstaged. Review merge conflicts manually; no force push, reset, destructive rebase or branch deletion.
