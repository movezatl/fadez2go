import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { BackHeader, Button, Card, Empty, Label, Loading, Row, Screen, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { REPORT_REASONS } from '@/lib/constants';
import { ago } from '@/lib/format';
import { errorMessage, supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

type Queue = {
  reports: { id: string; reason: string; details: string | null; target_name: string; reporter_name: string; created_at: string; chat_snapshot: { body: string; sender: string }[] | null; target_user: string }[];
  gyms: { id: string; user_name: string; gym_name: string; gym_address: string; coach_contact: string | null; proof_path: string | null; created_at: string }[];
  venues: { id: string; name: string; address: string; city: string }[];
  flagged_messages: number;
};

const empty: Queue = { reports: [], gyms: [], venues: [], flagged_messages: 0 };

// Moderation queue. Access is checked on the server (admin_users), not here.
export default function Admin() {
  const { data, loading, reload, error } = useLoad<Queue>(() => supabase.rpc('admin_queue'), empty);
  const [proofs, setProofs] = useState<Record<string, string>>({});

  const run = async (fn: string, args: Record<string, unknown>) => {
    const { error: e } = await supabase.rpc(fn, args);
    if (e) Alert.alert('Error', errorMessage(e));
    reload();
  };

  const viewProof = async (id: string) => {
    const { data: path } = await supabase.rpc('admin_log_proof_view', { p_id: id });
    if (!path) return;
    const { data: signed } = await supabase.storage.from('gym-proofs').createSignedUrl(path as string, 300);
    if (signed) setProofs((p) => ({ ...p, [id]: signed.signedUrl }));
  };

  if (loading) return <Loading />;
  if (error) return <Screen><BackHeader title="Admin" /><Empty title="Admins only" body={error} /></Screen>;

  return (
    <Screen>
      <BackHeader title="Admin" />
      <T color={colors.textSecondary}>{data.flagged_messages} flagged messages in the last 7 days.</T>

      <Label>Reports ({data.reports.length})</Label>
      {data.reports.map((r) => (
        <Card key={r.id} style={{ gap: space.xs }}>
          <T v="headline">
            {r.target_name} · {REPORT_REASONS.find((x) => x.value === r.reason)?.label}
          </T>
          <T v="caption" color={colors.textMuted}>
            From {r.reporter_name} · {ago(r.created_at)}
          </T>
          {r.details ? <T v="bodySmall">{r.details}</T> : null}
          {r.chat_snapshot?.slice(-5).map((m, i) => (
            <T key={i} v="caption" color={colors.textSecondary}>
              {m.sender === r.target_user ? r.target_name : 'Reporter'}: {m.body}
            </T>
          ))}
          <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
            <Button title="Ban" variant="danger" onPress={() => run('admin_resolve_report', { p_id: r.id, p_action: 'ban' })} />
            <Button title="Unhide" variant="secondary" onPress={() => run('admin_resolve_report', { p_id: r.id, p_action: 'unhide' })} />
            <Button title="Remove badge" variant="secondary" onPress={() => run('admin_resolve_report', { p_id: r.id, p_action: 'remove_gym_badge' })} />
            <Button title="Dismiss" variant="ghost" onPress={() => run('admin_resolve_report', { p_id: r.id, p_action: 'dismiss' })} />
          </Row>
        </Card>
      ))}

      <Label>Gym confirmations ({data.gyms.length})</Label>
      {data.gyms.map((g) => (
        <Card key={g.id} style={{ gap: space.xs }}>
          <T v="headline">
            {g.user_name} · {g.gym_name}
          </T>
          <T v="caption" color={colors.textSecondary}>
            {g.gym_address}
          </T>
          {g.coach_contact ? <T v="callout">Coach: {g.coach_contact}</T> : null}
          {g.proof_path && !proofs[g.id] ? <Button title="View proof (logged)" variant="secondary" onPress={() => viewProof(g.id)} /> : null}
          {proofs[g.id] ? <Image source={{ uri: proofs[g.id] }} style={{ width: '100%', height: 240 }} contentFit="contain" /> : null}
          <Row gap={space.xs}>
            <Button title="Approve" style={{ flex: 1 }} onPress={() => run('admin_review_gym', { p_id: g.id, p_approve: true })} />
            <Button title="Reject" variant="secondary" style={{ flex: 1 }} onPress={() => run('admin_review_gym', { p_id: g.id, p_approve: false })} />
          </Row>
        </Card>
      ))}

      <Label>New gyms ({data.venues.length})</Label>
      {data.venues.map((v) => (
        <Card key={v.id} style={{ gap: space.xs }}>
          <T v="headline">{v.name}</T>
          <T v="caption" color={colors.textSecondary}>
            {v.address}, {v.city}
          </T>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Button title="Approve" style={{ flex: 1 }} onPress={() => run('admin_review_venue', { p_id: v.id, p_approve: true })} />
            <Button title="Remove" variant="secondary" style={{ flex: 1 }} onPress={() => run('admin_review_venue', { p_id: v.id, p_approve: false })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
