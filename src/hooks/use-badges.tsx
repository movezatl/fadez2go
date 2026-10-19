import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { useAuth } from './use-auth';

type Badges = { notifications: number; fadez: number; chats: number; refresh: () => void };

const BadgeContext = createContext<Badges>({ notifications: 0, fadez: 0, chats: 0, refresh: () => {} });

// Unread counts for the tab bar and bell, kept live with Supabase Realtime.
export function BadgeProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const [counts, setCounts] = useState({ notifications: 0, fadez: 0, chats: 0 });

  const refresh = useCallback(async () => {
    if (!me || !profile?.onboarded) return;
    const [n, f, c] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
      supabase.from('fades').select('id', { count: 'exact', head: true }).eq('receiver', me).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).neq('sender', me).is('read_at', null),
    ]);
    setCounts({ notifications: n.count ?? 0, fadez: f.count ?? 0, chats: c.count ?? 0 });
  }, [me, profile?.onboarded]);

  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`badges:${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` }, refresh)
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, refresh]);

  return <BadgeContext.Provider value={{ ...counts, refresh }}>{children}</BadgeContext.Provider>;
}

export const useBadges = () => useContext(BadgeContext);
