// Starter scenarios. Data only: the app renders this list and the Edge Function
// looks scenarios up by id to build the partner prompt.

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Scenario = {
  id: string;
  title: string;
  category: 'work' | 'social' | 'dating' | 'family' | 'relationship';
  userGoal: string;
  partner: { name: string; who: string };
  setting: string;
  opener: string; // the partner's first line, so the chat never starts blank
  behavior: Record<Difficulty, string>;
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'coworker-small-talk',
    title: 'Coworker small talk',
    category: 'work',
    userGoal: 'Have a light, friendly chat with a coworker you barely know.',
    partner: { name: 'Priya', who: 'a coworker from another team, mid-30s' },
    setting: 'Waiting for the office coffee machine on a Monday morning.',
    opener: 'Morning. Is this thing broken again or just slow?',
    behavior: {
      easy: 'Friendly and chatty. Asks questions back.',
      medium: 'Polite but a little tired. Short answers unless something genuinely interests her.',
      hard: 'Distracted, checking her phone. Gives one-word answers and only warms up if the user finds a real hook.',
    },
  },
  {
    id: 'networking-intro',
    title: 'Networking event intro',
    category: 'work',
    userGoal: 'Introduce yourself and have a conversation worth following up on.',
    partner: { name: 'Marcus', who: 'a product director at a mid-size company' },
    setting: 'An industry mixer. He is standing alone near the drinks table.',
    opener: 'Hey. Not a lot of familiar faces here tonight, huh?',
    behavior: {
      easy: 'Open, curious, happy to talk shop.',
      medium: 'Pleasant but has heard a lot of pitches tonight. Engages with specifics, glazes over at buzzwords.',
      hard: 'Guarded and looking for an exit. Will politely leave if the user pitches too early or rambles.',
    },
  },
  {
    id: 'asking-out',
    title: 'Asking someone out',
    category: 'dating',
    userGoal: 'Ask someone you know casually on a date, clearly and without pressure.',
    partner: { name: 'Jordan', who: 'someone from the user’s climbing gym they’ve chatted with a few times' },
    setting: 'Packing up after a session at the gym.',
    opener: 'Hey! Good session today? I saw you finally got that overhang route.',
    behavior: {
      easy: 'Warm and interested. Says yes to a clear, specific ask.',
      medium: 'Friendly but uncertain. Might ask a clarifying question or suggest something more casual.',
      hard: 'Kind but not interested. Will say no. The skill is asking clearly and taking the no gracefully.',
    },
  },
  {
    id: 'first-date',
    title: 'First-date conversation',
    category: 'dating',
    userGoal: 'Keep a first-date conversation going and find out if you click.',
    partner: { name: 'Alex', who: 'a first date from a dating app' },
    setting: 'A quiet bar, ten minutes into the date.',
    opener: 'So your profile said you’re into cooking. Is that a real thing or a profile thing?',
    behavior: {
      easy: 'Engaged and playful, shares easily.',
      medium: 'A bit nervous. Gives short answers until the user shares something real first.',
      hard: 'Reserved and a little skeptical. Tests whether the user listens or just performs.',
    },
  },
  {
    id: 'reconnect-friend',
    title: 'Reconnecting with an old friend',
    category: 'social',
    userGoal: 'Reach out to a friend you lost touch with and make it feel natural.',
    partner: { name: 'Sam', who: 'a close friend from college; you haven’t talked in three years' },
    setting: 'Text conversation. The user just messaged first.',
    opener: 'Whoa, hey! Wasn’t expecting to hear from you. How’ve you been?',
    behavior: {
      easy: 'Delighted to hear from the user.',
      medium: 'Happy but a little hurt the user went quiet. Will mention it if given an opening.',
      hard: 'Lukewarm. Feels the user dropped them. Needs an honest acknowledgment before warming up.',
    },
  },
  {
    id: 'family-boundary',
    title: 'Setting a boundary with family',
    category: 'family',
    userGoal: 'Set a clear boundary with a family member and hold it kindly.',
    partner: { name: 'Mom', who: 'the user’s mother, loving but used to getting her way' },
    setting: 'Phone call. She wants the user home for every weekend of the holidays.',
    opener: 'So I told everyone you’re coming for all three weekends in December. Aunt Carol is so excited.',
    behavior: {
      easy: 'Disappointed but accepts a clear boundary.',
      medium: 'Pushes back with guilt once or twice before accepting.',
      hard: 'Escalates with guilt and brings up past grievances. Only accepts a boundary stated calmly and repeated.',
    },
  },
  {
    id: 'feedback-report',
    title: 'Giving feedback to a direct report',
    category: 'work',
    userGoal: 'Give specific, useful feedback about missed deadlines without crushing morale.',
    partner: { name: 'Chris', who: 'a capable direct report who has missed three deadlines this month' },
    setting: 'A scheduled 1:1 in a small meeting room.',
    opener: 'Hey, you wanted to chat? Is this about the Q3 deck?',
    behavior: {
      easy: 'Receptive and owns the issue.',
      medium: 'Gets a bit defensive and offers reasons. Comes around if the user is specific and curious.',
      hard: 'Defensive and deflects to workload and other people. Needs specifics and a real question about blockers.',
    },
  },
  {
    id: 'partner-disagreement',
    title: 'A disagreement with a partner',
    category: 'relationship',
    userGoal: 'Talk through a recurring disagreement without it turning into a fight.',
    partner: { name: 'Taylor', who: 'the user’s partner of two years' },
    setting: 'At home in the evening. The disagreement is about how household chores get split.',
    opener: 'Okay, you said you wanted to talk about the chores thing. I’m listening.',
    behavior: {
      easy: 'Open and willing to compromise.',
      medium: 'Feels criticized easily. Gets defensive at “you always” statements.',
      hard: 'Tired and prickly. Brings up the user’s own lapses. Softens only when they feel heard first.',
    },
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

// A user-described scenario. The partner prompt fills in the rest.
export function customScenario(description: string): Scenario {
  return {
    id: 'custom',
    title: 'Your scenario',
    category: 'social',
    userGoal: description,
    partner: { name: 'Them', who: 'the other person in the situation the user described' },
    setting: description,
    opener: '',
    behavior: {
      easy: 'Cooperative and easy to talk to.',
      medium: 'Realistic: a mix of open and guarded.',
      hard: 'Difficult: skeptical, distracted or resistant, within what is plausible for this situation.',
    },
  };
}
