import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput } from 'react-native';

import { Body, Button, DifficultyPicker, H2, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Difficulty } from '@shared/scenarios.ts';

export default function Custom() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <Screen>
      <Body>
        Describe the situation and who you’ll be talking to. Example: “Telling my roommate I’m moving out. She’s
        easygoing but we’re close and the lease ends in two months.”
      </Body>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        placeholder="The situation…"
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
      <H2>Difficulty</H2>
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      <Body muted>There’s no opener for custom scenarios, so you start the conversation.</Body>
      <Button
        title="Start practice"
        disabled={text.trim().length < 10}
        onPress={() =>
          router.replace({ pathname: '/practice', params: { scenarioId: 'custom', difficulty, custom: text.trim() } })
        }
      />
    </Screen>
  );
}
