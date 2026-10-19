import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeRow } from '@/components/fighter';
import { Button, Empty, ErrorText, Header, IconButton, Loading, Segmented } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { supabase } from '@/lib/supabase';
import type { FadeSummary } from '@/lib/types';
import { colors, screenGutter, space } from '@/theme';

type Tab = 'received' | 'sent' | 'upcoming' | 'past';

const filters: Record<Tab, (f: FadeSummary) => boolean> = {
  received: (f) => f.i_am === 'receiver' && f.status === 'pending',
  sent: (f) => (f.i_am === 'sender' && f.status === 'pending') || f.status === 'accepted',
  upcoming: (f) => f.status === 'on',
  past: (f) => ['declined', 'cancelled', 'expired', 'done'].includes(f.status),
};

export default function Fadez() {
  const [tab, setTab] = useState<Tab>('received');
  const { data, loading, refreshing, refresh, error } = useLoad<FadeSummary[]>(() => supabase.rpc('my_fades'), []);
  const rows = data.filter(filters[tab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: screenGutter, gap: space.sm }}>
        <Header
          title="Fadez"
          right={
            <IconButton label="Friends" onPress={() => router.push('/friends')}>
              <Users color={colors.text} size={22} />
            </IconButton>
          }
        />
        <Segmented
          options={[
            { value: 'received', label: 'Received' },
            { value: 'sent', label: 'Sent' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ErrorText>{error}</ErrorText>
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: screenGutter, gap: space.sm, paddingBottom: space.huge }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <Empty
              title="No fadez yet"
              body="Find someone on Discover."
              action={<Button title="Go to Discover" variant="secondary" onPress={() => router.navigate('/')} />}
            />
          }
          renderItem={({ item }) => <FadeRow fade={item} />}
        />
      )}
    </SafeAreaView>
  );
}
