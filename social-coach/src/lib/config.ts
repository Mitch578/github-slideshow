import Constants from 'expo-constants';

export const APP_NAME = 'Social Coach'; // working name, see PROGRESS.md

// Bump when the consent screen text changes. Must match COACH_CONSENT_VERSION
// in supabase/functions/coach/config.ts.
export const CONSENT_VERSION = '2026-10-13';

export const MAX_USER_TURNS = 12;

// Only the Supabase URL and anon key ever ship in the app. If they are unset
// the app runs on the mock AI so it works in Expo Go with no backend.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const USE_MOCK_AI = !SUPABASE_URL || !SUPABASE_ANON_KEY;

// Placeholders until the pages exist (Week 3).
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://example.com/privacy';
export const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? 'https://example.com/support';

export const APP_VERSION = Constants.expoConfig?.version ?? 'dev';
