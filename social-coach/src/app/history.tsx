import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Body, Card, Screen } from '@/components/ui';
import { listSessions, type LocalSession } from '@/lib/storage';
import { DIFFICULTY_LABEL } from '@shared/scenarios.ts';

export default function History() {
  const [sessions, setSessions] = useState<LocalSession[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions);
    }, []),
  );

  if (!sessions) return null;
  return (
    <Screen>
      {sessions.length === 0 && <Body muted>No sessions yet. Your practice and prep plans will show up here.</Body>}
      {sessions.map((s) => (
        <Card key={s.id} onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })}>
          <ThemedText style={{ fontWeight: 700 }}>{s.title}</ThemedText>
          <Body muted>
            {new Date(s.createdAt).toLocaleString()}
            {s.kind === 'practice' ? ` · ${DIFFICULTY_LABEL[s.difficulty]}` : ''}
            {s.kind === 'practice' && !s.debrief && !s.crisis ? ' · no debrief yet' : ''}
          </Body>
          {s.debrief && <Body>{s.debrief.summary}</Body>}
          {s.prepSituation && <ThemedText numberOfLines={2}>{s.prepSituation}</ThemedText>}
        </Card>
      ))}
    </Screen>
  );
}
