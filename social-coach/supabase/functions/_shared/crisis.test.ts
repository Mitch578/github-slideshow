// Run: npm test   (node --test, Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CRISIS_MARKER, detectCrisis } from './crisis.ts';
import { runPracticeTurn } from './flow.ts';

test('flags direct self-harm statements', () => {
  for (const s of [
    'honestly I want to kill myself',
    "I've been thinking about suicide",
    'sometimes I think everyone would be better off dead without me... I mean I would be better off dead',
    "I keep cutting myself when it's bad",
    "I don't see a reason, I want to die",
    'my partner is going to hurt me when he gets home',
  ]) {
    assert.equal(detectCrisis(s), true, s);
  }
});

test('flags the model-emitted marker', () => {
  assert.equal(detectCrisis(`ok ${CRISIS_MARKER}`), true);
});

test('does not flag ordinary practice lines', () => {
  for (const s of [
    'Hi, I am Sam. What brings you to this event?',
    'That presentation killed it, nice work',
    "I'd love to grab coffee sometime if you're up for it",
    'Can we talk about how chores are split?',
    '',
  ]) {
    assert.equal(detectCrisis(s), false, s);
  }
});

test('crisis path: turn stops, model is not called, session is locked', async () => {
  let modelCalls = 0;
  const callModel = async () => {
    modelCalls++;
    return 'sure';
  };

  const first = await runPracticeTurn({ userText: 'I want to kill myself', sessionLocked: false, callModel });
  assert.equal(first.kind, 'crisis');
  assert.equal(modelCalls, 0);

  // Any later turn in the same session must not resume coaching.
  const second = await runPracticeTurn({ userText: 'ok anyway, back to the date', sessionLocked: true, callModel });
  assert.equal(second.kind, 'crisis');
  assert.equal(modelCalls, 0);
});

test('crisis path: model marker in the reply triggers crisis and hides the reply', async () => {
  const res = await runPracticeTurn({
    userText: "I just don't see the point of anything anymore",
    sessionLocked: false,
    callModel: async () => `${CRISIS_MARKER}`,
  });
  assert.equal(res.kind, 'crisis');
});

test('normal turn returns the model reply', async () => {
  const res = await runPracticeTurn({
    userText: 'Hey, how was your weekend?',
    sessionLocked: false,
    callModel: async () => 'Fine. Busy. You?',
  });
  assert.deepEqual(res, { kind: 'reply', text: 'Fine. Busy. You?' });
});

test('does not flag common idioms', () => {
  for (const s of ['beats me, honestly', 'that really hits me as unfair', "I'll kill it at the interview"]) {
    assert.equal(detectCrisis(s), false, s);
  }
});
