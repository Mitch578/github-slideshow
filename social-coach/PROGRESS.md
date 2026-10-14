# PROGRESS

Last updated: 2026-10-14

## Done

- **Prerequisites (build container):** Node v22.22.0, npm 10.9.4, git 2.43.0. Verified by command output on 2026-10-13. This is the cloud build container, not the owner's computer. The owner's machine still needs checking.
- **SDK choice: Expo SDK 57.** npm `expo` dist-tags on 2026-10-13: `latest` = 57.0.28, `next` = 58.0.7. No stable SDK 58 announcement found in search ([SDK 58 beta changelog](https://expo.dev/changelog/sdk-58-beta)). We are not using the 58 beta.
- **Project created** with `create-expo-app@5.0.0 --template default@sdk-57` (TypeScript + Expo Router). Template demo screens removed.
- **All MVP screens built:** onboarding, AI consent, home (scenarios + difficulty), describe-your-own, practice chat (12-turn cap, End anytime), debrief, prep, history, session detail, settings (withdraw consent, delete all data, privacy/support links, version).
- **Mock AI** runs when no Supabase env vars are set, so the phone test doesn't depend on the backend.
- **Backend written, not deployed:** migration (profiles, sessions, messages, debriefs, usage, all with RLS; `usage_daily` view), Edge Function `coach` (consent check, 20 turns/day cap, 12 turns/session cap, max tokens, usage logging, delete-all incl. auth user).
- **Decided 2026-10-14:** Apple enrollment as an individual; app stays in `social-coach/` inside `mitch578/github-slideshow`.
- **Name:** Norm (owner decision 2026-10-14). The coach prompt speaks as Norm.
- **Prompts** versioned (`partner-v1`, `coach-v2`); the version is stored on each session.
- **Crisis path:** shared detector runs on device (a crisis message never leaves the phone) and again on the server. The partner model can also flag with a marker. The session gets locked, 988 resources are shown, and coaching doesn't resume. Tests: `npm test`, 7/7 passing.
- **Checks passing:** `tsc --noEmit` (app), Edge Function typecheck against `@anthropic-ai/sdk@0.133.0` types (via a Deno shim, since Deno itself wasn't run), `expo lint`, and an offline `expo export --platform ios` bundle (1177 modules). No API key strings found in the bundle.

## Next

1. Owner runs the app in Expo Go on the iPhone in demo mode. Owner is phone-only right now, so the QR flow is blocked. Option being set up: publish with EAS Update from the cloud container. That needs expo.dev hosts allowed in the environment network policy plus an EXPO_TOKEN environment variable. UNKNOWN whether App Store Expo Go opens EAS Update links for this project; verify.
2. Owner creates the Supabase project and Anthropic API key, then we deploy (README → "Connect the real backend").
3. Real end-to-end test on the phone: finish a scenario, see a debrief.
4. Measure tokens per session from `usage` and report cost per practice session.
5. Apple Developer enrollment → EAS build → TestFlight.

## Open decisions

- iOS bundle identifier: placeholder `com.REPLACE_ME.norm` in app.json.
- App Store name: "Norm" is the app name (owner decision 2026-10-14). UNKNOWN whether "Norm" is free on the App Store; names must be unique. Fallbacks to check when creating the App Store Connect record: "Norm: Social Coach", "Norm – AI Social Coach".
- Prompt location: the spec says `/server/prompts/`. They live in `supabase/functions/_shared/prompts/` because the Edge Function deploy bundles from `supabase/functions/` (ASSUMPTION: importing from outside that folder may not bundle; not tested).

## UNKNOWN / ASSUMPTION

- UNKNOWN: Whether Expo Go on the owner's phone is still on SDK 57 today. expo.dev was unreachable from the build container. A Sept 2026 release note found via search says the App Store Expo Go supports SDK 57.
- UNKNOWN: Expo Go iOS requiring the same Expo account in the CLI and the app comes from the owner's prompt and wasn't re-verified (expo.dev blocked).
- ASSUMPTION: `npx expo start --tunnel` is still Expo's tunneling option. Not re-verified against current docs.
- ASSUMPTION: Supabase CLI commands in the README (`link`, `db push`, `secrets set`, `functions deploy`) come from memory plus community sources, not current official docs (supabase.com was unreachable).
- ASSUMPTION: Supabase now documents `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` as legacy, and new projects get `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` (JSON). The function accepts either. The dictionary shape (a `default` entry) is unverified. Check on first deploy.
- ASSUMPTION: `@react-native-async-storage/async-storage@2.2.0` (the version SDK 57's `bundledNativeModules.json` pins) is included in Expo Go. Verify on the phone.
- ASSUMPTION: Apple 5.1.1(v) account deletion and anonymous auth. Delete-all ships either way.
- Models (verified against Anthropic's model reference cached 2026-10-06): partner `claude-haiku-5-5` (effort low), coach `claude-sonnet-5-5` (effort medium, JSON-schema structured output, server-side refusal fallback beta `server-side-fallback-2026-07-01`). Pricing listed there: Haiku 5.5 $0.10/$0.50 per M tokens, Sonnet 5.5 $2/$10. Cost per session is UNKNOWN until we measure.
- 988 crisis line wording must be re-confirmed before shipping.
- Daily cap resets at UTC midnight (JUDGMENT: simple; revisit if users complain).
- `expo-doctor`: 19/21 checks passed. The 2 failures were network checks (exp.host and React Native Directory unreachable from the container), not project problems.
- `npm audit` reports 29 vulnerabilities in template dependencies. Not triaged yet.
