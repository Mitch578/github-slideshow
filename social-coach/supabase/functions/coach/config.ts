// All tunables live here and can be overridden with Supabase secrets/env vars
// (supabase secrets set NAME=value) without a code change.
const env = (name: string, fallback: string) => Deno.env.get(name) ?? fallback;
const int = (name: string, fallback: number) => Number.parseInt(env(name, String(fallback)), 10);

export const config = {
  // Model IDs verified against Anthropic's model list on 2026-10-13. Re-check before release.
  partnerModel: env('COACH_PARTNER_MODEL', 'claude-haiku-5-5'),
  coachModel: env('COACH_COACH_MODEL', 'claude-sonnet-5-5'),
  partnerMaxTokens: int('COACH_PARTNER_MAX_TOKENS', 400),
  coachMaxTokens: int('COACH_COACH_MAX_TOKENS', 4000),
  dailyTurnCap: int('COACH_DAILY_TURN_CAP', 20),
  maxUserTurnsPerSession: int('COACH_MAX_USER_TURNS', 12),
  maxUserTextChars: int('COACH_MAX_USER_TEXT_CHARS', 1000),
  // Must match CONSENT_VERSION in the app (src/lib/config.ts).
  consentVersion: env('COACH_CONSENT_VERSION', '2026-10-13'),
};
