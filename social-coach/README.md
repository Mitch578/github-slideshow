# Social Coach (working name)

AI social coach for iPhone. Expo SDK 57 (React Native, TypeScript, Expo Router) + Supabase (Postgres, anonymous auth, Edge Functions) + Claude via the Anthropic Messages API, called only from the server.

```
src/app/                    screens (Expo Router)
src/lib/ai.ts               the only AI entry point in the app (mock or real)
src/lib/storage.ts          on-device history + consent flag
supabase/functions/coach/   Edge Function: consent check, caps, Anthropic calls, usage logging
supabase/functions/_shared/ code shared by app + server: scenarios, crisis detector, prompts, types
supabase/migrations/        tables + row-level security
```

## Run on your iPhone (demo mode, no backend)

On your computer (macOS, Windows or Linux):

```bash
git clone https://github.com/mitch578/github-slideshow.git
cd github-slideshow
git checkout claude/social-coach-iphone-build-sh55zn
cd social-coach
npm install
npx expo login        # your Expo account
npx expo start
```

On the iPhone: install **Expo Go** from the App Store, sign in with the same Expo account, then open the Camera app and point it at the QR code in the terminal. If the phone can't connect (different Wi-Fi, office network), stop the server and run `npx expo start --tunnel`.

With no `.env`, the app runs on canned mock replies (marked `[mock]`), so you can click through every screen.

## Connect the real backend

1. Create a Supabase project. In the dashboard, enable **anonymous sign-ins** under Authentication.
2. From `social-coach/`:
   ```bash
   npx supabase login
   npx supabase init                 # only if supabase/config.toml doesn't exist yet; keep existing folders
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push              # creates tables + RLS
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy coach
   ```
3. `cp .env.example .env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Restart `npx expo start`. The "Demo mode" card on Home disappears.

Tunables (models, caps, max tokens) are in `supabase/functions/coach/config.ts`. Override any of them with `npx supabase secrets set NAME=value`.

## Checks

```bash
npm test            # crisis-path tests
npm run typecheck
npx expo lint
```

## Cost queries (Supabase SQL editor)

```sql
select * from usage_daily;                                  -- tokens per day/model/kind
select session_id, sum(input_tokens) inp, sum(output_tokens) outp
from usage where session_id is not null group by 1 order by 2 desc limit 20;
```
