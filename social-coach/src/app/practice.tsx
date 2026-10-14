import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT, Body, Button, Card, CrisisPanel, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coach, CoachError, ERROR_TEXT, scenarioFor } from '@/lib/ai';
import { MAX_USER_TURNS } from '@/lib/config';
import { getLocalConsent, saveSession, type LocalSession } from '@/lib/storage';
import { DIFFICULTY_LABEL, type Difficulty } from '@shared/scenarios.ts';

export default function Practice() {
  const params = useLocalSearchParams<{ scenarioId: string; difficulty: Difficulty; custom?: string }>();
  const scenario = scenarioFor(params.scenarioId, params.custom);
  const difficulty = (params.difficulty ?? 'medium') as Difficulty;

  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [consent, setConsent] = useState<boolean | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocalConsent().then((c) => setConsent(!!c));
  }, []);

  useEffect(() => {
    if (!consent || session) return;
    coach
      .startSession(params.scenarioId, difficulty, params.custom)
      .then((id) => {
        const s: LocalSession = {
          id,
          kind: 'practice',
          scenarioId: params.scenarioId,
          title: scenario.title,
          customDescription: params.custom,
          difficulty,
          messages: scenario.opener ? [{ role: 'partner', text: scenario.opener }] : [],
          createdAt: new Date().toISOString(),
        };
        setSession(s);
        return saveSession(s);
      })
      .catch((e) => setError(ERROR_TEXT[e instanceof CoachError ? e.code : 'network'] ?? 'Something went wrong.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent]);

  if (consent === null) return null;
  if (!consent) {
    return (
      <Screen>
        <Card>
          <Body>Practice needs your OK to send your messages to the AI provider.</Body>
          <Button title="Review and turn on" onPress={() => router.push('/consent')} />
        </Card>
      </Screen>
    );
  }

  const userTurns = session?.messages.filter((m) => m.role === 'user').length ?? 0;
  const atCap = userTurns >= MAX_USER_TURNS;
  const locked = !!session?.crisis;

  const update = async (next: LocalSession) => {
    setSession(next);
    await saveSession(next);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !session || sending || atCap || locked) return;
    setInput('');
    setError(null);
    const withUser: LocalSession = { ...session, messages: [...session.messages, { role: 'user', text }] };
    setSession(withUser);
    setSending(true);
    try {
      const res = await coach.turn({
        sessionId: session.id,
        text,
        difficulty,
        sessionLocked: locked,
        turnIndex: userTurns,
      });
      if (res.kind === 'crisis') {
        // Drop the crisis message from local history too; just mark the session.
        await update({ ...session, crisis: true });
      } else {
        await update({ ...withUser, messages: [...withUser.messages, { role: 'partner', text: res.text }] });
      }
    } catch (e) {
      const code = e instanceof CoachError ? e.code : 'network';
      setError(ERROR_TEXT[code] ?? 'Something went wrong. Try again.');
      setSession(session);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const endAndDebrief = () => {
    if (!session) return;
    router.replace({ pathname: '/debrief', params: { id: session.id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Stack.Screen
        options={{
          title: scenario.title,
          headerRight: () =>
            session && userTurns > 0 && !locked ? (
              <Pressable onPress={endAndDebrief} hitSlop={8}>
                <ThemedText style={{ color: ACCENT, fontWeight: 600 }}>End</ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <ThemedView style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={session?.messages ?? []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <Body muted>
              {scenario.setting} You’re talking with {scenario.partner.name}. {DIFFICULTY_LABEL[difficulty]} ·{' '}
              {MAX_USER_TURNS} turns max. Tap End anytime.
            </Body>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: ACCENT }
                  : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement },
              ]}>
              <ThemedText style={item.role === 'user' ? { color: '#fff' } : undefined}>{item.text}</ThemedText>
            </View>
          )}
          ListFooterComponent={
            <View style={{ gap: Spacing.two }}>
              {!session && !error && <ActivityIndicator />}
              {sending && <ThemedText themeColor="textSecondary">{scenario.partner.name} is typing…</ThemedText>}
              {error && <Body muted>{error}</Body>}
              {locked && <CrisisPanel />}
              {atCap && !locked && (
                <Card>
                  <Body>That’s {MAX_USER_TURNS} turns. Let’s see how it went.</Body>
                  <Button title="See debrief" onPress={endAndDebrief} />
                </Card>
              )}
            </View>
          }
        />
        {!locked && !atCap && (
          <View
            style={[
              styles.composer,
              { borderTopColor: theme.backgroundSelected, paddingBottom: Math.max(insets.bottom, Spacing.two) },
            ]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={session ? 'Your reply…' : 'Starting…'}
              placeholderTextColor={theme.textSecondary}
              editable={!!session}
              multiline
              maxLength={1000}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Button title="Send" onPress={send} disabled={!input.trim() || !session} loading={sending} />
          </View>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 12, paddingHorizontal: 12, paddingTop: 12, fontSize: 16 },
});
