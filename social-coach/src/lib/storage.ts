// On-device store: onboarding/consent flags and session history.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Difficulty } from '@shared/scenarios.ts';
import type { ChatMessage, Debrief, PrepPlan } from '@shared/types.ts';

export type LocalSession = {
  id: string; // server session id, or a local id in mock mode
  kind: 'practice' | 'prep';
  scenarioId: string;
  title: string;
  customDescription?: string;
  difficulty: Difficulty;
  messages: ChatMessage[];
  debrief?: Debrief;
  prepSituation?: string;
  prepPlan?: PrepPlan;
  crisis?: boolean;
  createdAt: string;
};

const KEYS = {
  onboarded: 'sc.onboarded',
  consent: 'sc.consent', // { version, at } | absent
  sessions: 'sc.sessions',
};

export async function getOnboarded() {
  return (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
}
export async function setOnboarded() {
  await AsyncStorage.setItem(KEYS.onboarded, '1');
}

export async function getLocalConsent(): Promise<{ version: string; at: string } | null> {
  const raw = await AsyncStorage.getItem(KEYS.consent);
  return raw ? JSON.parse(raw) : null;
}
export async function setLocalConsent(version: string | null) {
  if (version) await AsyncStorage.setItem(KEYS.consent, JSON.stringify({ version, at: new Date().toISOString() }));
  else await AsyncStorage.removeItem(KEYS.consent);
}

export async function listSessions(): Promise<LocalSession[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  const all: LocalSession[] = raw ? JSON.parse(raw) : [];
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSession(id: string) {
  return (await listSessions()).find((s) => s.id === id);
}

export async function saveSession(session: LocalSession) {
  const all = (await listSessions()).filter((s) => s.id !== session.id);
  all.push(session);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(all));
}

export async function clearAllLocalData() {
  await AsyncStorage.clear();
}
