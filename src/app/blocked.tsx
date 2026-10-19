import { BackHeader, Button, Empty, Loading, Row, Screen, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { supabase } from '@/lib/supabase';

type Blocked = { user_id: string; display_name: string | null; username: string | null };

export default function BlockedList() {
  const { data, loading, reload } = useLoad<Blocked[]>(() => supabase.rpc('my_blocks'), []);
  if (loading) return <Loading />;
  return (
    <Screen>
      <BackHeader title="Blocked" />
      {data.length === 0 ? <Empty title="Nobody blocked" /> : null}
      {data.map((b) => (
        <Row key={b.user_id} style={{ justifyContent: 'space-between' }}>
          <T v="headline">{b.display_name ?? b.username}</T>
          <Button
            title="Unblock"
            variant="secondary"
            onPress={async () => {
              await supabase.rpc('unblock_user', { p_target: b.user_id });
              reload();
            }}
          />
        </Row>
      ))}
    </Screen>
  );
}
