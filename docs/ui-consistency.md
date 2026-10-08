# MindEase visual consistency pass

The shared palette lives in `src/constants/colors.ts`; typography lives in
`src/constants/typography.ts`. Student and counselor header/navigation layouts
share `src/constants/care-layout.ts`. Keep screen accents in these tokens.

Shared cards use rounded white surfaces and subtle borders. Primary actions use
campus green; `CareButton` supports visual `secondary`, `danger` and `compact`
variants. Inputs preserve their original handlers and add visible focus styling.
Status messages use distinct calm success/error surfaces.

Student, anonymous and counselor screens inherit centered mobile shells on web,
full available width on native, scrollable content and bottom navigation outside
the scroll area. No navigation destinations were changed.

Polished areas include home, mood forms/history/reflections, live chat, crisis
information, appointment forms/summaries, resources and personal notes, profiles,
counselor dashboard, availability/session screens and support options.

This is presentation work only. Service modules, authentication configuration,
route guards, booking draft logic, Firestore rules and CRUD allocation were kept
byte-identical. No Firebase setup or rules publication is required for this pass.

Validation: lint, TypeScript and Expo web export pass. Existing mood/chat,
appointments/notes, reflections/saved resources, availability/sessions and profile
service/screen-handler regressions pass. The static fixture renderer includes
student/anonymous/counselor screens and loading/empty/error variants, plus login,
registration and support. Home, mood and dashboard screenshots were inspected.
These fixtures use mocked data; they do not replace real-account/device testing
or Firestore emulator security tests. Supplied Figma assets were unavailable in
the workspace, so styling follows the established MindEase reference direction.
