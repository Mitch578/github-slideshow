import { ThemedText } from '@/components/themed-text';
import { Body, Card, H2, ScoreRow } from '@/components/ui';
import type { Debrief, PrepPlan } from '@shared/types.ts';

export function DebriefView({ d }: { d: Debrief }) {
  return (
    <>
      <Card>
        <ScoreRow label="Warmth" value={d.scores.warmth} />
        <ScoreRow label="Curiosity" value={d.scores.curiosity} />
        <ScoreRow label="Clarity" value={d.scores.clarity} />
        <ScoreRow label="Confidence" value={d.scores.confidence} />
        <Body muted>{d.summary}</Body>
      </Card>

      <H2>What worked</H2>
      {d.worked.map((w, i) => (
        <Card key={i}>
          <ThemedText style={{ fontStyle: 'italic' }}>“{w.quote}”</ThemedText>
          <Body>{w.why}</Body>
        </Card>
      ))}

      <H2>One thing to change</H2>
      <Card>
        <ThemedText style={{ fontStyle: 'italic' }}>“{d.change.quote}”</ThemedText>
        <Body>{d.change.try_instead}</Body>
      </Card>

      <H2>Try next time</H2>
      <Card>
        <Body>{d.next_time}</Body>
      </Card>
    </>
  );
}

export function PrepView({ p }: { p: PrepPlan }) {
  return (
    <>
      <H2>Openers</H2>
      <Card>
        {p.openers.map((o, i) => (
          <Body key={i}>• {o}</Body>
        ))}
      </Card>

      <H2>Likely turns</H2>
      {p.likely_turns.map((t, i) => (
        <Card key={i}>
          <Body muted>They might: {t.they_might}</Body>
          <Body>You could: {t.you_could}</Body>
        </Card>
      ))}

      <H2>Exit line</H2>
      <Card>
        <Body>{p.exit_line}</Body>
      </Card>

      <H2>Focus on</H2>
      <Card>
        <Body>{p.one_focus}</Body>
      </Card>
    </>
  );
}
