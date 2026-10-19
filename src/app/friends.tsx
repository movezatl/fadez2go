import { router } from 'expo-router';
import { View } from 'react-native';

import { FighterCard } from '@/components/fighter';
import { BackHeader, Button, Empty, Label, Loading, Row, Screen } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { supabase } from '@/lib/supabase';
import type { FighterCard as Card } from '@/lib/types';
import { space } from '@/theme';

type FriendRow = { friendship_id: string; status: 'pending' | 'accepted'; direction: 'sent' | 'received'; card: Card | null };

export default function Friends() {
  const { data, loading, reload } = useLoad<FriendRow[]>(() => supabase.rpc('my_friends'), []);
  const rows = data.filter((r) => r.card);
  const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'received');
  const friends = rows.filter((r) => r.status === 'accepted');
  const sent = rows.filter((r) => r.status === 'pending' && r.direction === 'sent');

  const respond = async (id: string, accept: boolean) => {
    await supabase.rpc('respond_friend_request', { p_id: id, p_accept: accept });
    reload();
  };

  if (loading) return <Loading />;

  return (
    <Screen>
      <BackHeader title="Friends" />
      {incoming.length ? <Label>Requests</Label> : null}
      {incoming.map((r) => (
        <View key={r.friendship_id} style={{ gap: space.xs }}>
          <FighterCard card={r.card!} />
          <Row gap={space.sm}>
            <Button title="Accept" style={{ flex: 1 }} onPress={() => respond(r.friendship_id, true)} />
            <Button title="Not now" variant="secondary" style={{ flex: 1 }} onPress={() => respond(r.friendship_id, false)} />
          </Row>
        </View>
      ))}
      <Label>Friends</Label>
      {friends.length ? (
        friends.map((r) => <FighterCard key={r.friendship_id} card={r.card!} />)
      ) : (
        <Empty title="No friends yet" body="Add fighters from their profile. Friends can message each other any time." action={<Button title="Find fighters" variant="secondary" onPress={() => router.navigate('/')} />} />
      )}
      {sent.length ? <Label>Sent</Label> : null}
      {sent.map((r) => (
        <FighterCard key={r.friendship_id} card={r.card!} />
      ))}
    </Screen>
  );
}
