import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { DebriefView, PrepView } from '@/components/results';
import { ThemedText } from '@/components/themed-text';
import { Body, Button, Card, CrisisPanel, H2, Screen } from '@/components/ui';
import { getSession, type LocalSession } from '@/lib/storage';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [s, setS] = useState<LocalSession | null | undefined>(undefined);

  useEffect(() => {
    getSession(id).then((x) => setS(x ?? null));
  }, [id]);

  if (s === undefined) return null;
  if (s === null) {
    return (
      <Screen>
        <Body>Session not found.</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: s.title }} />
      {s.kind === 'prep' && s.prepPlan && (
        <>
          <Card>
            <Body muted>{s.prepSituation}</Body>
          </Card>
          <PrepView p={s.prepPlan} />
        </>
      )}
      {s.kind === 'practice' && (
        <>
          {s.crisis && <CrisisPanel />}
          {s.debrief && <DebriefView d={s.debrief} />}
          {!s.debrief && !s.crisis && s.messages.some((m) => m.role === 'user') && (
            <Button title="Get debrief" onPress={() => router.push({ pathname: '/debrief', params: { id: s.id } })} />
          )}
          <H2>Conversation</H2>
          <Card>
            {s.messages.map((m, i) => (
              <ThemedText key={i} themeColor={m.role === 'user' ? 'text' : 'textSecondary'}>
                {m.role === 'user' ? 'You' : 'Them'}: {m.text}
              </ThemedText>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
