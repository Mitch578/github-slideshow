import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CRISIS_RESOURCES } from '@shared/crisis.ts';
import { DIFFICULTY_LABEL, type Difficulty } from '@shared/scenarios.ts';

export const ACCENT = '#2F6FEB';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!scroll) return <ThemedView style={styles.screen}>{children}</ThemedView>;
  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </ThemedView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const bg = variant === 'primary' ? ACCENT : variant === 'danger' ? '#C62828' : theme.backgroundElement;
  const fg = variant === 'secondary' ? theme.text : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <ThemedText style={{ color: fg, fontWeight: 600 }}>{title}</ThemedText>}
    </Pressable>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const theme = useTheme();
  const inner = <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {inner}
    </Pressable>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.h1}>{children}</ThemedText>;
}
export function H2({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.h2}>{children}</ThemedText>;
}
export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <ThemedText themeColor={muted ? 'textSecondary' : 'text'} style={styles.body}>
      {children}
    </ThemedText>
  );
}

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
      {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
        <Pressable
          key={d}
          accessibilityRole="button"
          accessibilityState={{ selected: value === d }}
          onPress={() => onChange(d)}
          style={[styles.segmentItem, value === d && { backgroundColor: ACCENT }]}>
          <ThemedText style={{ color: value === d ? '#fff' : theme.text, fontWeight: 600 }}>
            {DIFFICULTY_LABEL[d]}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function CrisisPanel() {
  return (
    <Card style={{ borderColor: '#C62828', borderWidth: 2 }}>
      <H2>{CRISIS_RESOURCES.title}</H2>
      <Body>{CRISIS_RESOURCES.body}</Body>
      {CRISIS_RESOURCES.lines.map((l) => (
        <Button key={l.url} title={l.label} variant="danger" onPress={() => Linking.openURL(l.url)} />
      ))}
      <Body muted>Coaching is paused for this conversation.</Body>
    </Card>
  );
}

export function ScoreRow({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.scoreRow}>
      <ThemedText style={{ width: 100 }}>{label}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.pip, { backgroundColor: i <= value ? ACCENT : theme.backgroundSelected }]}
          />
        ))}
      </View>
      <ThemedText themeColor="textSecondary">{value}/5</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: 400 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pip: { width: 18, height: 10, borderRadius: 3 },
});
