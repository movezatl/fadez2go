// Sends an Expo push notification for each new row in public.notifications.
// Triggered by a Supabase Database Webhook (INSERT on public.notifications) that
// sends the header `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`. See docs/SETUP.md.
// Push text is the notification's title and body, which never contain message
// content (SEC-C9).
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');

type Row = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  fade_id: string | null;
  conversation_id: string | null;
  actor_id: string | null;
};

Deno.serve(async (req) => {
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }
  const payload = await req.json();
  const n = payload.record as Row | undefined;
  if (payload.type !== 'INSERT' || !n) return new Response('ignored');

  const { data: me } = await supabase
    .from('profile_private')
    .select('push_token, muted_types')
    .eq('id', n.user_id)
    .maybeSingle();
  if (!me?.push_token || (me.muted_types ?? []).includes(n.type)) return new Response('no token');

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', n.user_id)
    .is('read_at', null);

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      to: me.push_token,
      title: n.title,
      body: n.body,
      sound: 'default',
      badge: count ?? 1,
      data: { type: n.type, fade_id: n.fade_id, conversation_id: n.conversation_id, actor_id: n.actor_id },
    }),
  });
  const result = await res.json();

  // Expo says the token is dead: forget it.
  if (result?.data?.details?.error === 'DeviceNotRegistered') {
    await supabase.from('profile_private').update({ push_token: null }).eq('id', n.user_id);
  }
  await supabase.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id);
  return new Response('sent');
});
