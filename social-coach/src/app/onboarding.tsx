import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { APP_NAME } from '@/lib/config';
import { setOnboarded } from '@/lib/storage';

export default function Onboarding() {
  const next = async () => {
    await setOnboarded();
    router.replace('/');
    router.push('/consent');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Screen>
        <H1>{APP_NAME}</H1>
        <Body>Practice real conversations before they happen.</Body>

        <Card>
          <H2>How it works</H2>
          <Body>1. Pick a situation: small talk, networking, a date, a hard talk with family or a coworker.</Body>
          <Body>2. Practice by text. The AI plays the other person, and it won’t always make it easy.</Body>
          <Body>3. Get a debrief: what worked, what to change, and one thing to try next time, using your own lines.</Body>
          <Body>4. Or prep: describe something coming up and get a short game plan.</Body>
        </Card>

        <Card>
          <H2>This is coaching, not therapy</H2>
          <Body>
            It’s a practice tool for everyday social skills. It doesn’t diagnose or treat anything and isn’t a
            substitute for a mental health professional. If you’re in crisis in the US, call or text 988.
          </Body>
        </Card>

        <Button title="Continue" onPress={next} />
      </Screen>
    </SafeAreaView>
  );
}
