import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Body, Button, Card, H2, Screen } from '@/components/ui';
import { coach, CoachError, ERROR_TEXT } from '@/lib/ai';
import { APP_VERSION, PRIVACY_POLICY_URL, SUPPORT_URL } from '@/lib/config';
import { clearAllLocalData, getLocalConsent, setLocalConsent } from '@/lib/storage';

export default function Settings() {
  const [consent, setConsent] = useState<{ version: string; at: string } | null>(null);
  const [busy, setBusy] = useState<'withdraw' | 'delete' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLocalConsent().then(setConsent);
    }, []),
  );

  const withdraw = () =>
    Alert.alert('Turn off AI practice?', 'Nothing more will be sent to the AI provider. Your history stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          setBusy('withdraw');
          try {
            await coach.withdrawConsent();
            await setLocalConsent(null);
            setConsent(null);
          } catch (e) {
            Alert.alert('Couldn’t update', ERROR_TEXT[e instanceof CoachError ? e.code : 'network'] ?? ERROR_TEXT.network);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const deleteAll = () =>
    Alert.alert(
      'Delete all your data?',
      'This permanently deletes your sessions, debriefs and usage records from our server and this phone. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await coach.deleteAllServerData();
              await clearAllLocalData();
              router.dismissAll();
              router.replace('/onboarding');
            } catch (e) {
              Alert.alert(
                'Couldn’t delete',
                `${ERROR_TEXT[e instanceof CoachError ? e.code : 'network'] ?? ERROR_TEXT.network} Nothing was deleted from this phone.`,
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <H2>AI practice</H2>
      <Card>
        {consent ? (
          <>
            <Body>On. Your practice messages and scenario details are sent to Anthropic to generate replies and feedback.</Body>
            <Body muted>Agreed {new Date(consent.at).toLocaleDateString()}</Body>
            <Button title="Withdraw AI consent" variant="secondary" onPress={withdraw} loading={busy === 'withdraw'} />
          </>
        ) : (
          <>
            <Body>Off. Nothing is sent to the AI provider.</Body>
            <Button title="Review and turn on" onPress={() => router.push('/consent')} />
          </>
        )}
      </Card>

      <H2>Your data</H2>
      <Card>
        <Body>Delete everything this app has stored about you, on our server and on this phone.</Body>
        <Button title="Delete all my data" variant="danger" onPress={deleteAll} loading={busy === 'delete'} />
      </Card>

      <H2>About</H2>
      <Button title="Privacy policy" variant="secondary" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
      <Button title="Support" variant="secondary" onPress={() => Linking.openURL(SUPPORT_URL)} />
      <Body muted>
        Version {APP_VERSION}
        {coach.isMock ? ' · demo mode (mock AI)' : ''}
      </Body>
      <Body muted>Coaching, not therapy. In a crisis in the US, call or text 988.</Body>
    </Screen>
  );
}
