import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { BackHeader, Gap, Label, ListRow, Screen, SwitchRow, T } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { SUPPORT_EMAIL } from '@/lib/legal';
import { clearPushToken } from '@/lib/push';
import { errorMessage, supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function Settings() {
  const { profile, refresh } = useAuth();
  const me = profile!.id;
  const [visible, setVisible] = useState(profile?.show_in_search ?? true);

  const toggleVisible = async (v: boolean) => {
    setVisible(v);
    await supabase.from('profiles').update({ show_in_search: v }).eq('id', me);
    refresh();
  };

  const signOut = async (scope: 'local' | 'global') => {
    await clearPushToken(me);
    await supabase.auth.signOut({ scope });
  };

  const clearLocation = () =>
    Alert.alert('Clear my location?', 'Distances won\'t show until you allow location again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => supabase.rpc('clear_location') },
    ]);

  const deleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This removes your profile, location, photos, fades and messages. It can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_my_account');
            if (error) Alert.alert('Could not delete', errorMessage(error));
            else await supabase.auth.signOut({ scope: 'local' });
          },
        },
      ],
    );

  return (
    <Screen>
      <BackHeader title="Settings" />
      <View>
        <SwitchRow label="Show me in Discover" body="Off hides you from search. Friends and open fades still work." value={visible} onChange={toggleVisible} />
      </View>
      <Label>Privacy and safety</Label>
      <View>
        <ListRow label="Blocked fighters" onPress={() => router.push('/blocked')} />
        <ListRow label="Clear my location" onPress={clearLocation} />
        <ListRow label="Safety center" onPress={() => router.push('/safety')} />
      </View>
      <Label>Legal</Label>
      <View>
        <ListRow label="Terms of Service" onPress={() => router.push('/legal/terms')} />
        <ListRow label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
        <ListRow label="Participant Waiver" onPress={() => router.push('/legal/waiver')} />
        <ListRow label="Contact support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      </View>
      <Label>Account</Label>
      <View>
        <ListRow label="Sign out" onPress={() => signOut('local')} />
        <ListRow label="Sign out everywhere" onPress={() => signOut('global')} />
        <ListRow label="Delete account" danger onPress={deleteAccount} />
      </View>
      <Gap />
      <T v="caption" color={colors.textMuted}>
        Fadez2Go never handles money. Training only, both fighters say yes.
      </T>
    </Screen>
  );
}
