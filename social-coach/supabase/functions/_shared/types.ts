// Shapes exchanged between the app and the coach Edge Function.
import type { Difficulty } from './scenarios.ts';

export type ChatMessage = { role: 'user' | 'partner'; text: string };

export type Debrief = {
  scores: { warmth: number; curiosity: number; clarity: number; confidence: number };
  worked: { quote: string; why: string }[];
  change: { quote: string; try_instead: string };
  next_time: string;
  summary: string;
};

export type PrepPlan = {
  openers: string[];
  likely_turns: { they_might: string; you_could: string }[];
  exit_line: string;
  one_focus: string;
};

export type StartRequest = {
  action: 'start';
  scenario_id: string; // 'custom' allowed with custom_description
  custom_description?: string;
  difficulty: Difficulty;
};

export type CoachRequest =
  | { action: 'consent'; consent_version: string }
  | { action: 'withdraw_consent' }
  | StartRequest
  | { action: 'turn'; session_id: string; text: string }
  | { action: 'debrief'; session_id: string }
  | { action: 'prep'; situation: string }
  | { action: 'delete_all' };

export const DEBRIEF_JSON_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      description: 'Each score is an integer from 1 (weak) to 5 (strong).',
      properties: {
        warmth: { type: 'integer' },
        curiosity: { type: 'integer' },
        clarity: { type: 'integer' },
        confidence: { type: 'integer' },
      },
      required: ['warmth', 'curiosity', 'clarity', 'confidence'],
      additionalProperties: false,
    },
    worked: {
      type: 'array',
      description: 'Exactly two things that worked. quote is the user’s own line, verbatim.',
      items: {
        type: 'object',
        properties: { quote: { type: 'string' }, why: { type: 'string' } },
        required: ['quote', 'why'],
        additionalProperties: false,
      },
    },
    change: {
      type: 'object',
      description: 'One thing to change. quote is the user’s own line, verbatim.',
      properties: { quote: { type: 'string' }, try_instead: { type: 'string' } },
      required: ['quote', 'try_instead'],
      additionalProperties: false,
    },
    next_time: { type: 'string', description: 'One specific thing to try next time.' },
    summary: { type: 'string', description: 'One or two plain sentences.' },
  },
  required: ['scores', 'worked', 'change', 'next_time', 'summary'],
  additionalProperties: false,
} as const;

export const PREP_JSON_SCHEMA = {
  type: 'object',
  properties: {
    openers: { type: 'array', items: { type: 'string' }, description: 'Two or three openers.' },
    likely_turns: {
      type: 'array',
      description: 'Two to four likely turns in the conversation.',
      items: {
        type: 'object',
        properties: { they_might: { type: 'string' }, you_could: { type: 'string' } },
        required: ['they_might', 'you_could'],
        additionalProperties: false,
      },
    },
    exit_line: { type: 'string' },
    one_focus: { type: 'string', description: 'The single most important thing to keep in mind.' },
  },
  required: ['openers', 'likely_turns', 'exit_line', 'one_focus'],
  additionalProperties: false,
} as const;
