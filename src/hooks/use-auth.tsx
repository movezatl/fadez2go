import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { VERSIONS } from '@/lib/legal';
import { supabase } from '@/lib/supabase';
import type { WeightClass } from '@/lib/types';

export type MyProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  area: string | null;
  weight_class: WeightClass | null;
  stance: string | null;
  pronouns: string | null;
  goals: string[];
  gym_name: string | null;
  show_in_search: boolean;
  onboarded: boolean;
};

type MyStatus = { gym_confirmed: boolean; banned_at: string | null; birth_date: string | null };

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: MyProfile | null;
  status: MyStatus | null;
  isAdmin: boolean;
  needsConsent: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setStatus(null);
      setIsAdmin(false);
      setNeedsConsent(false);
      return;
    }
    const [p, st, admin, consents] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('profile_status').select('gym_confirmed, banned_at, birth_date').eq('id', s.user.id).maybeSingle(),
      supabase.rpc('is_admin'),
      supabase.from('consents').select('document, version'),
    ]);
    setProfile((p.data as MyProfile) ?? null);
    setStatus((st.data as MyStatus) ?? null);
    setIsAdmin(Boolean(admin.data));
    const accepted = new Set((consents.data ?? []).map((c) => `${c.document}:${c.version}`));
    setNeedsConsent(
      Boolean(p.data?.onboarded) &&
        !(['terms', 'privacy', 'waiver'] as const).every((d) => accepted.has(`${d}:${VERSIONS[d]}`)),
    );
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(() => load(session), [load, session]);

  return (
    <AuthContext.Provider value={{ ready, session, profile, status, isAdmin, needsConsent, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useMe() {
  const { session } = useAuth();
  return session?.user.id ?? '';
}
