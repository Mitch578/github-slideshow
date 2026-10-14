import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { TextInput } from 'react-native';

import { PrepView } from '@/components/results';
import { Body, Button, Card, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { coach, CoachError, ERROR_TEXT } from '@/lib/ai';
import { getLocalConsent, saveSession } from '@/lib/storage';
import type { PrepPlan } from '@shared/types.ts';

export default function Prep() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLocalConsent().then((c) => setConsent(!!c));
    }, []),
  );

  const go = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await coach.prep(text.trim());
      setPlan(p);
      await saveSession({
        id: `prep-${Date.now()}`,
        kind: 'prep',
        scenarioId: 'prep',
        title: 'Prep plan',
        difficulty: 'medium',
        messages: [],
        prepSituation: text.trim(),
        prepPlan: p,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(ERROR_TEXT[e instanceof CoachError ? e.code : 'network'] ?? 'Couldn’t make a plan.');
    } finally {
      setLoading(false);
    }
  };

  if (consent === false) {
    return (
      <Screen>
        <Card>
          <Body>Prep needs your OK to send what you type to the AI provider.</Body>
          <Button title="Review and turn on" onPress={() => router.push('/consent')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Body>What’s coming up? Who’s involved, what you want out of it, and anything you’re worried about.</Body>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        placeholder="e.g. Asking my manager for a raise on Thursday. She’s fair but busy…"
        placeholderTextColor={theme.textSecondary}
        style={{
          minHeight: 140,
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          textAlignVertical: 'top',
          color: theme.text,
          backgroundColor: theme.backgroundElement,
        }}
      />
      <Button title={plan ? 'Make a new plan' : 'Make a plan'} onPress={go} loading={loading} disabled={text.trim().length < 10} />
      {error && <Body>{error}</Body>}
      {plan && <PrepView p={plan} />}
    </Screen>
  );
}
