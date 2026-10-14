// Crisis detection shared by the app (runs before anything is sent) and the
// coach Edge Function (defense in depth). No imports so it runs in Deno,
// Metro and Node's test runner unchanged.
//
// This is a conservative keyword screen, not a classifier. It is meant to
// over-trigger rather than miss. The partner prompt also asks the model to emit
// CRISIS_MARKER for indirect statements the patterns can't catch.

export const CRISIS_MARKER = '[[CRISIS]]';

// US resource. Confirm current wording/numbers before shipping (see PROGRESS.md).
export const CRISIS_RESOURCES = {
  title: "Let's pause the practice.",
  body:
    "It sounds like you might be going through something serious. This app is a practice tool and can't help with that, but people can, right now.",
  lines: [
    { label: 'Call or text 988 (Suicide & Crisis Lifeline, US)', url: 'tel:988' },
    { label: 'Text 988', url: 'sms:988' },
    { label: 'If you are in immediate danger, call 911', url: 'tel:911' },
  ],
};

const PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bkms\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+(it\s+all|my\s+life)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bself[-\s]?harm/i,
  /\bhurt(ing)?\s+my\s*self\b/i,
  /\bcut(ting)?\s+my\s*self\b/i,
  /\boverdose\b/i,
  /\b(going\s+to|gonna|will|threaten(ed|s)?\s+to)\s+(hurt|hit|kill|beat)\s+me\b/i,
  /\b(hurting|hitting|beating|abusing)\s+me\b/i,
  /\bafraid\s+for\s+my\s+(life|safety)\b/i,
  /\b(kill|hurt)\s+(him|her|them|someone|somebody)\b/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (text.includes(CRISIS_MARKER)) return true;
  return PATTERNS.some((p) => p.test(text));
}
