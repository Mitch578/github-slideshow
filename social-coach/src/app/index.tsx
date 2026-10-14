import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACCENT, Body, Button, Card, DifficultyPicker, H2, Screen } from '@/components/ui';
import { coach } from '@/lib/ai';
import { getLocalConsent, getOnboarded } from '@/lib/storage';
import { SCENARIOS, type Difficulty } from '@shared/scenarios.ts';

export default function Home() {
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  useFocusEffect(
    useCallback(() => {
      getOnboarded().then(setOnboardedState);
      getLocalConsent().then((c) => setHasConsent(!!c));
    }, []),
  );

  if (onboarded === null) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={() => router.push('/history')} hitSlop={8}>
                <ThemedText style={{ color: ACCENT }}>History</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                <ThemedText style={{ color: ACCENT }}>Settings</ThemedText>
              </Pressable>
            </View>
          ),
        }}
      />

      {coach.isMock && (
        <Card>
          <Body muted>Demo mode: AI replies are canned placeholders until the backend is connected.</Body>
        </Card>
      )}

      {!hasConsent && (
        <Card onPress={() => router.push('/consent')}>
          <Body>Practice uses an AI provider. Tap to review and turn it on.</Body>
        </Card>
      )}

      <H2>Difficulty</H2>
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />

      <H2>Pick a scenario</H2>
      {SCENARIOS.map((s) => (
        <Card
          key={s.id}
          onPress={() => router.push({ pathname: '/practice', params: { scenarioId: s.id, difficulty } })}>
          <ThemedText style={{ fontWeight: 700 }}>{s.title}</ThemedText>
          <Body muted>{s.userGoal}</Body>
        </Card>
      ))}

      <Button title="Describe your own" variant="secondary" onPress={() => router.push('/custom')} />
      <Button title="Prep for something coming up" variant="secondary" onPress={() => router.push('/prep')} />
    </Screen>
  );
}
