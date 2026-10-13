// Single entry point for everything AI. Screens never call Supabase or the
// mock directly. Mock mode is used when no Supabase env vars are set.
import { runPracticeTurn, type TurnResult } from '@shared/flow.ts';
import { customScenario, getScenario, type Difficulty, type Scenario } from '@shared/scenarios.ts';
import type { ChatMessage, CoachRequest, Debrief, PrepPlan } from '@shared/types.ts';

import { CONSENT_VERSION, USE_MOCK_AI } from './config';
import { ensureSignedIn, supabase } from './supabase';

export class CoachError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const ERROR_TEXT: Record<string, string> = {
  consent_required: 'Practice needs your OK to use the AI. You can turn it on in Settings.',
  daily_cap: 'You’ve hit today’s practice limit. It resets at midnight UTC.',
  turn_cap: 'That’s the end of this conversation. Time for the debrief.',
  ai_busy: 'The AI is busy right now. Try again in a minute.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
};

export function scenarioFor(scenarioId: string, customDescription?: string): Scenario {
  return scenarioId === 'custom' ? customScenario(customDescription ?? '') : getScenario(scenarioId)!;
}

async function call<T>(body: CoachRequest): Promise<T> {
  if (!supabase) throw new Error('backend not configured');
  await ensureSignedIn();
  const { data, error } = await supabase.functions.invoke('coach', { body });
  if (error) {
    // FunctionsHttpError carries the Response in .context
    const ctx = (error as { context?: Response }).context;
    let code = 'network';
    try {
      if (ctx && typeof ctx.json === 'function') code = (await ctx.json()).error ?? 'server_error';
    } catch {}
    throw new CoachError(code);
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- mock ----------

const MOCK_REPLIES: Record<Difficulty, string[]> = {
  easy: ['Oh nice, tell me more about that.', 'Ha, same here honestly. What got you into it?', 'That’s cool. How long have you been doing that?'],
  medium: ['Mm. Yeah.', 'Sure, I guess. Why do you ask?', 'Okay. And?', 'Huh. Didn’t expect that.'],
  hard: ['Sorry, what?', 'Right.', 'I should probably get going soon.', 'Not really my thing.'],
};

function mockDebrief(messages: ChatMessage[]): Debrief {
  const mine = messages.filter((m) => m.role === 'user').map((m) => m.text);
  const pick = (i: number) => mine[Math.min(i, mine.length - 1)] ?? '';
  return {
    scores: { warmth: 3, curiosity: mine.some((t) => t.includes('?')) ? 4 : 2, clarity: 3, confidence: 3 },
    worked: [
      { quote: pick(0), why: '[MOCK] You opened instead of waiting for them to carry it.' },
      { quote: pick(1), why: '[MOCK] You kept it short, which gave them room to answer.' },
    ],
    change: { quote: pick(mine.length - 1), try_instead: '[MOCK] Ask about something they just said, not a new topic.' },
    next_time: '[MOCK] Ask one follow-up question before sharing your own story.',
    summary: '[MOCK] This is placeholder feedback. Real debriefs come from the coach once the backend is connected.',
  };
}

function mockPrep(situation: string): PrepPlan {
  return {
    openers: ['[MOCK] Hey, good to see you. How’s your week going?', `[MOCK] I wanted to talk about: ${situation.slice(0, 60)}`],
    likely_turns: [
      { they_might: '[MOCK] Give a short, distracted answer.', you_could: '[MOCK] Ask about one specific thing they mentioned.' },
      { they_might: '[MOCK] Push back.', you_could: '[MOCK] Say what you heard, then restate your point once, calmly.' },
    ],
    exit_line: '[MOCK] I’ll let you go, but this was good. Let’s pick it up soon.',
    one_focus: '[MOCK] Listen for one thing to follow up on.',
  };
}

// ---------- public API ----------

export const coach = {
  isMock: USE_MOCK_AI,

  async recordConsent() {
    if (USE_MOCK_AI) return;
    await call({ action: 'consent', consent_version: CONSENT_VERSION });
  },

  async withdrawConsent() {
    if (USE_MOCK_AI) return;
    await call({ action: 'withdraw_consent' });
  },

  async startSession(scenarioId: string, difficulty: Difficulty, customDescription?: string): Promise<string> {
    if (USE_MOCK_AI) return `mock-${Date.now()}`;
    const res = await call<{ session_id: string }>({
      action: 'start',
      scenario_id: scenarioId,
      difficulty,
      custom_description: customDescription,
    });
    return res.session_id;
  },

  async turn(args: {
    sessionId: string;
    text: string;
    difficulty: Difficulty;
    sessionLocked: boolean;
    turnIndex: number;
  }): Promise<TurnResult> {
    if (USE_MOCK_AI) {
      return runPracticeTurn({
        userText: args.text,
        sessionLocked: args.sessionLocked,
        callModel: async () => {
          await sleep(600);
          const pool = MOCK_REPLIES[args.difficulty];
          return `${pool[args.turnIndex % pool.length]} [mock]`;
        },
      });
    }
    // The server repeats this check; doing it here first means a crisis message
    // never leaves the device.
    const local = await runPracticeTurn({
      userText: args.text,
      sessionLocked: args.sessionLocked,
      callModel: async () => '',
    });
    if (local.kind === 'crisis') return local;
    return call<TurnResult>({ action: 'turn', session_id: args.sessionId, text: args.text });
  },

  async debrief(sessionId: string, messages: ChatMessage[]): Promise<Debrief> {
    if (USE_MOCK_AI) {
      await sleep(800);
      return mockDebrief(messages);
    }
    return (await call<{ debrief: Debrief }>({ action: 'debrief', session_id: sessionId })).debrief;
  },

  async prep(situation: string): Promise<PrepPlan> {
    if (USE_MOCK_AI) {
      await sleep(800);
      return mockPrep(situation);
    }
    return (await call<{ plan: PrepPlan }>({ action: 'prep', situation })).plan;
  },

  async deleteAllServerData() {
    if (USE_MOCK_AI || !supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) await call({ action: 'delete_all' });
    await supabase.auth.signOut();
  },
};
