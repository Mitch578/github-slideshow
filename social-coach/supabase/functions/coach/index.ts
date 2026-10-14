// The only code that talks to Anthropic. Every request:
//   1. authenticates the caller from their Supabase JWT (anonymous users included),
//   2. checks the server-side consent record before any AI call,
//   3. enforces per-session and per-day caps,
//   4. logs token usage per call.
import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { runPracticeTurn } from '../_shared/flow.ts';
import { COACH_PROMPT_VERSION, debriefSystemPrompt, debriefUserContent, prepSystemPrompt } from '../_shared/prompts/coach.ts';
import { PARTNER_PROMPT_VERSION, partnerSystemPrompt } from '../_shared/prompts/partner.ts';
import { customScenario, getScenario, type Difficulty, type Scenario } from '../_shared/scenarios.ts';
import {
  DEBRIEF_JSON_SCHEMA,
  PREP_JSON_SCHEMA,
  type ChatMessage,
  type CoachRequest,
  type Debrief,
  type PrepPlan,
} from '../_shared/types.ts';
import { config } from './config.ts';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'unauthenticated');

    // User-scoped client: RLS applies to every query below.
    const db = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await db.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
    if (userError || !userData.user) throw new HttpError(401, 'unauthenticated');
    const userId = userData.user.id;

    const body = (await req.json()) as CoachRequest;
    switch (body.action) {
      case 'consent':
        return json(await recordConsent(db, userId, body.consent_version));
      case 'withdraw_consent':
        return json(await withdrawConsent(db, userId));
      case 'delete_all':
        return json(await deleteAll(userId));
      case 'start':
        await requireConsent(db, userId);
        return json(await startSession(db, body.scenario_id, body.difficulty, body.custom_description));
      case 'turn':
        await requireConsent(db, userId);
        return json(await practiceTurn(db, userId, body.session_id, body.text));
      case 'debrief':
        await requireConsent(db, userId);
        return json(await debrief(db, userId, body.session_id));
      case 'prep':
        await requireConsent(db, userId);
        return json(await prep(db, userId, body.situation));
      default:
        throw new HttpError(400, 'unknown_action');
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'ai_busy' }, 503);
    if (e instanceof Anthropic.APIError) {
      console.error('anthropic error', e.status, e.message);
      return json({ error: 'ai_error' }, 502);
    }
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});

// ---------- consent ----------

async function recordConsent(db: SupabaseClient, userId: string, version: string) {
  if (version !== config.consentVersion) throw new HttpError(400, 'consent_version_mismatch');
  const { error } = await db.from('profiles').upsert({
    id: userId,
    consent_at: new Date().toISOString(),
    consent_version: version,
    consent_withdrawn_at: null,
  });
  if (error) throw error;
  return { ok: true };
}

async function withdrawConsent(db: SupabaseClient, userId: string) {
  const { error } = await db
    .from('profiles')
    .upsert({ id: userId, consent_withdrawn_at: new Date().toISOString() });
  if (error) throw error;
  return { ok: true };
}

async function requireConsent(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('profiles')
    .select('consent_at, consent_version, consent_withdrawn_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  // recordConsent clears consent_withdrawn_at, so any value here means withdrawn.
  const ok = data?.consent_at && data.consent_version === config.consentVersion && !data.consent_withdrawn_at;
  if (!ok) throw new HttpError(403, 'consent_required');
}

// ---------- practice ----------

async function startSession(db: SupabaseClient, scenarioId: string, difficulty: Difficulty, custom?: string) {
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new HttpError(400, 'bad_difficulty');
  if (scenarioId === 'custom') {
    if (!custom?.trim()) throw new HttpError(400, 'missing_description');
  } else if (!getScenario(scenarioId)) {
    throw new HttpError(400, 'unknown_scenario');
  }
  const { data, error } = await db
    .from('sessions')
    .insert({
      scenario_id: scenarioId,
      custom_description: scenarioId === 'custom' ? custom!.slice(0, config.maxUserTextChars) : null,
      difficulty,
      prompt_version: `${PARTNER_PROMPT_VERSION}+${COACH_PROMPT_VERSION}`,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { session_id: data.id };
}

type SessionRow = {
  id: string;
  scenario_id: string;
  custom_description: string | null;
  difficulty: Difficulty;
  crisis: boolean;
};

async function loadSession(db: SupabaseClient, sessionId: string) {
  const { data, error } = await db
    .from('sessions')
    .select('id, scenario_id, custom_description, difficulty, crisis')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'session_not_found');
  const row = data as SessionRow;
  const scenario: Scenario =
    row.scenario_id === 'custom' ? customScenario(row.custom_description ?? '') : getScenario(row.scenario_id)!;
  const { data: msgs, error: msgError } = await db
    .from('messages')
    .select('role, text')
    .eq('session_id', sessionId)
    .order('id');
  if (msgError) throw msgError;
  return { row, scenario, messages: (msgs ?? []) as ChatMessage[] };
}

async function practiceTurn(db: SupabaseClient, userId: string, sessionId: string, rawText: string) {
  const text = (rawText ?? '').trim().slice(0, config.maxUserTextChars);
  if (!text) throw new HttpError(400, 'empty_message');

  const { row, scenario, messages } = await loadSession(db, sessionId);
  if (messages.filter((m) => m.role === 'user').length >= config.maxUserTurnsPerSession) {
    throw new HttpError(409, 'turn_cap');
  }
  await enforceDailyCap(db);

  const result = await runPracticeTurn({
    userText: text,
    sessionLocked: row.crisis,
    callModel: async () => {
      const history: Anthropic.MessageParam[] = [];
      if (scenario.opener) {
        history.push({ role: 'user', content: '[The conversation starts. You speak first.]' });
        history.push({ role: 'assistant', content: scenario.opener });
      }
      for (const m of [...messages, { role: 'user', text } as ChatMessage]) {
        history.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
      }
      const res = await anthropic.messages.create({
        model: config.partnerModel,
        max_tokens: config.partnerMaxTokens,
        output_config: { effort: 'low' },
        system: partnerSystemPrompt(scenario, row.difficulty),
        messages: history,
      });
      await logUsage(db, userId, sessionId, 'turn', res);
      if (res.stop_reason === 'refusal') return '(They don’t respond.)';
      return textOf(res);
    },
  });

  if (result.kind === 'crisis') {
    // Lock the session. The user's crisis message is intentionally not stored.
    await db.from('sessions').update({ crisis: true, ended_at: new Date().toISOString() }).eq('id', sessionId);
    return { kind: 'crisis' };
  }

  const { error } = await db.from('messages').insert([
    { session_id: sessionId, role: 'user', text },
    { session_id: sessionId, role: 'partner', text: result.text },
  ]);
  if (error) throw error;
  return { kind: 'reply', text: result.text };
}

async function enforceDailyCap(db: SupabaseClient) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'turn')
    .gte('created_at', startOfDay.toISOString());
  if (error) throw error;
  if ((count ?? 0) >= config.dailyTurnCap) throw new HttpError(429, 'daily_cap');
}

async function debrief(db: SupabaseClient, userId: string, sessionId: string) {
  const { row, scenario, messages } = await loadSession(db, sessionId);
  if (row.crisis) throw new HttpError(409, 'session_locked');
  if (!messages.some((m) => m.role === 'user')) throw new HttpError(400, 'nothing_to_debrief');

  const body = await coachJson<Debrief>(db, userId, sessionId, 'debrief', {
    system: debriefSystemPrompt(),
    user: debriefUserContent(scenario, row.difficulty, messages),
    schema: DEBRIEF_JSON_SCHEMA,
  });
  const { error } = await db
    .from('debriefs')
    .insert({ session_id: sessionId, body, prompt_version: COACH_PROMPT_VERSION });
  if (error) throw error;
  await db.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
  return { debrief: body };
}

async function prep(db: SupabaseClient, userId: string, situation: string) {
  const text = (situation ?? '').trim().slice(0, config.maxUserTextChars);
  if (!text) throw new HttpError(400, 'empty_message');
  const plan = await coachJson<PrepPlan>(db, userId, null, 'prep', {
    system: prepSystemPrompt(),
    user: text,
    schema: PREP_JSON_SCHEMA,
  });
  return { plan };
}

async function coachJson<T>(
  db: SupabaseClient,
  userId: string,
  sessionId: string | null,
  kind: 'debrief' | 'prep',
  p: { system: string; user: string; schema: Record<string, unknown> },
): Promise<T> {
  // Server-side refusal fallback (beta) so a false-positive safety decline is
  // re-run on a fallback model instead of failing the debrief.
  const res = await anthropic.beta.messages.create({
    model: config.coachModel,
    max_tokens: config.coachMaxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: p.schema } },
    system: p.system,
    messages: [{ role: 'user', content: p.user }],
  });
  await logUsage(db, userId, sessionId, kind, res);
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'ai_declined');
  if (res.stop_reason === 'max_tokens') throw new HttpError(502, 'ai_truncated');
  return JSON.parse(textOf(res)) as T;
}

// ---------- delete ----------

async function deleteAll(userId: string) {
  // Service role is needed to delete the auth user. Row deletes cascade from auth.users.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), {
    auth: { persistSession: false },
  });
  for (const table of ['usage', 'debriefs', 'messages', 'sessions', 'profiles']) {
    const { error } = await admin.from(table).delete().eq(table === 'profiles' ? 'id' : 'user_id', userId);
    if (error) throw error;
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { ok: true };
}

// ---------- helpers ----------

// Supabase now documents SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY as legacy
// and also injects SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS as JSON
// dictionaries. Use whichever this project has. ASSUMPTION: the dictionary has
// a "default" entry; otherwise the first entry is used. Verify on first deploy.
function supabaseKey(legacyName: string, dictName: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  const dict = JSON.parse(Deno.env.get(dictName) ?? '{}') as Record<string, string>;
  const key = dict.default ?? Object.values(dict)[0];
  if (!key) throw new Error(`missing ${legacyName} / ${dictName}`);
  return key;
}

type AnyMessage = Anthropic.Message | Anthropic.Beta.BetaMessage;

function textOf(res: AnyMessage): string {
  let out = '';
  for (const b of res.content) if (b.type === 'text') out += b.text;
  return out.trim();
}

async function logUsage(db: SupabaseClient, userId: string, sessionId: string | null, kind: string, res: AnyMessage) {
  const u = res.usage;
  const { error } = await db.from('usage').insert({
    user_id: userId,
    session_id: sessionId,
    kind,
    model: res.model,
    input_tokens: u.input_tokens ?? 0,
    output_tokens: u.output_tokens ?? 0,
    cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
  });
  if (error) console.error('usage log failed', error);
}
