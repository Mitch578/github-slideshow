// Turn-level control flow shared by the mock client and the Edge Function, so
// the crisis path is tested once and behaves the same in both.
import { detectCrisis } from './crisis.ts';

export type TurnResult = { kind: 'reply'; text: string } | { kind: 'crisis' };

export async function runPracticeTurn(args: {
  userText: string;
  sessionLocked: boolean;
  callModel: () => Promise<string>;
}): Promise<TurnResult> {
  if (args.sessionLocked || detectCrisis(args.userText)) return { kind: 'crisis' };
  const reply = await args.callModel();
  if (detectCrisis(reply)) return { kind: 'crisis' };
  return { kind: 'reply', text: reply.trim() };
}
