import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { DebriefView } from '@/components/results';
import { Body, Button, H1, Screen } from '@/components/ui';
import { coach, CoachError, ERROR_TEXT } from '@/lib/ai';
import { getSession, saveSession, type LocalSession } from '@/lib/storage';

export default function DebriefScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<LocalSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (s: LocalSession | undefined) => {
    if (!s) return setError('Session not found.');
    setSession(s);
    if (s.debrief || s.crisis) return;
    try {
      const debrief = await coach.debrief(s.id, s.messages);
      const next = { ...s, debrief };
      await saveSession(next);
      setSession(next);
    } catch (e) {
      setError(ERROR_TEXT[e instanceof CoachError ? e.code : 'network'] ?? 'Couldn’t get the debrief.');
    }
  }, []);

  const load = useCallback(() => getSession(id).then(generate), [id, generate]);

  useEffect(() => {
    getSession(id).then(generate);
  }, [id, generate]);

  return (
    <Screen>
      <H1>{session?.title ?? 'Debrief'}</H1>
      {!session?.debrief && !error && <ActivityIndicator />}
      {!session?.debrief && !error && <Body muted>Your coach is reading the conversation…</Body>}
      {error && (
        <>
          <Body>{error}</Body>
          <Button
            title="Try again"
            onPress={() => {
              setError(null);
              load();
            }}
          />
        </>
      )}
      {session?.debrief && <DebriefView d={session.debrief} />}
      {session?.debrief && (
        <>
          <Button
            title="Practice this again"
            onPress={() =>
              router.replace({
                pathname: '/practice',
                params: {
                  scenarioId: session.scenarioId,
                  difficulty: session.difficulty,
                  custom: session.customDescription,
                },
              })
            }
          />
          <Button title="Back to scenarios" variant="secondary" onPress={() => router.dismissTo('/')} />
        </>
      )}
    </Screen>
  );
}
