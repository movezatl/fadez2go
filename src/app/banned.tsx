import { Button, Gap, Screen, T } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/lib/legal';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

export default function Banned() {
  return (
    <Screen>
      <Gap h={space.huge} />
      <T v="displayL">Account suspended</T>
      <T color={colors.textSecondary}>
        This account was suspended for breaking the Fighter Code. If you think this is a mistake, email {SUPPORT_EMAIL}.
      </T>
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
