-- Fadez2Go core schema.
--
-- Product rules enforced here (see CLAUDE.md, docs/SPEC.md, docs/SECURITY.md):
--   * a fade is only 'on' after the receiver accepts and both fighters confirm
--     the risk and safety checklist (respond_fade, confirm_fade)
--   * no money: no payment columns anywhere; money words are flagged in chat and notes
--   * fades happen only at approved training venues
--   * 18+ only, enforced on the server (complete_profile)
--   * other users never see coordinates, birthdays or raw rows: they read other
--     fighters only through RPCs that return safe columns and distance bands
--   * chat only between friends (both accepted) or fighters with an accepted fade
--
-- Every write that involves two people goes through a security definer function
-- that sets search_path = '' and checks auth.uid(); the app never writes those
-- tables directly.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins (SEC-AU7): a table only the service role can change.
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Text checks (SEC-C3): flag, never block.
-- ---------------------------------------------------------------------------

create or replace function public.has_money_words(t text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(t, '') ~* '(\$|\mbets?\M|\mbetting\M|\mwagers?\M|\mpurses?\M|\mprizes?\M|\mcash ?app\M|\mvenmo\M|\mzelle\M|\mpaypal\M|\mcash\M|\mmoney\M|\mpay(s|ing|ment|ments)?\M|\modds\M|\mstakes?\M|\mtickets?\M)';
$$;

create or replace function public.has_threat_words(t text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(t, '') ~* '(\mkill (you|u)\M|\mi.?ll find (you|u)\M|\mshoot\M|\mgun\M|\mknife\M|\mstab\M|\mi know where you live\M|\mstreet fight|\mparking lot\M|\mbring a weapon\M)';
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  avatar_path text,
  bio text check (char_length(bio) <= 300),
  area text check (char_length(area) <= 60),
  weight_class text check (weight_class in (
    'flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight',
    'middleweight', 'light_heavyweight', 'heavyweight'
  )),
  stance text check (stance in ('orthodox', 'southpaw', 'switch')),
  pronouns text check (char_length(pronouns) <= 20),
  goals text[] not null default '{}'
    check (goals <@ array['technique', 'conditioning', 'fight_prep', 'hobby']),
  gym_name text check (char_length(gym_name) <= 80),
  show_in_search boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Fields only the server writes: never updatable by the user (SEC-R4).
create table public.profile_status (
  id uuid primary key references public.profiles (id) on delete cascade,
  gym_confirmed boolean not null default false,
  gym_confirmed_at timestamptz,
  banned_at timestamptz,
  hidden_for_review boolean not null default false,
  birth_date date
);

-- Owner-only data: snapped location and push token (SEC-L2).
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  lat numeric(5, 2),
  lng numeric(5, 2),
  location_updated_at timestamptz,
  push_token text,
  muted_types text[] not null default '{}'
);

-- Clickwrap record: one row per document version accepted.
create table public.consents (
  user_id uuid not null references public.profiles (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy', 'waiver')),
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document, version)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.profile_status (id) values (new.id);
  insert into public.profile_private (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A user may never flip onboarded themselves; complete_profile does it.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.onboarded := old.onboarded;
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.is_active_user(uid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.profile_status s on s.id = p.id
    where p.id = uid and p.onboarded and s.banned_at is null
  );
$$;

create table public.sports (
  slug text primary key,
  name text not null,
  sort int not null
);

insert into public.sports (slug, name, sort) values
  ('boxing', 'Boxing', 1),
  ('muay_thai', 'Muay Thai', 2),
  ('kickboxing', 'Kickboxing', 3),
  ('bjj_gi', 'BJJ (gi)', 4),
  ('bjj_nogi', 'BJJ (no-gi)', 5),
  ('wrestling', 'Wrestling', 6),
  ('mma', 'MMA', 7),
  ('judo', 'Judo', 8),
  ('karate', 'Karate', 9),
  ('taekwondo', 'Taekwondo', 10),
  ('sambo', 'Sambo', 11),
  ('sanda', 'Kung Fu / Sanda', 12),
  ('other', 'Other', 13);

create table public.profile_sports (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null references public.sports (slug),
  level text not null check (level in ('new', '1-3', '3+', 'amateur', 'pro')),
  intent text not null check (intent in ('train', 'try')),
  primary key (profile_id, sport)
);

-- ---------------------------------------------------------------------------
-- Blocks and friends
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester <> addressee)
);

create unique index friendships_pair on public.friendships
  (least(requester, addressee), greatest(requester, addressee));

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- Venues: gyms and training facilities only
-- ---------------------------------------------------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  address text not null check (char_length(address) between 5 and 160),
  city text not null check (char_length(city) between 2 and 60),
  approved boolean not null default false,
  suggested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fades (sparring requests), SEC-A1 to A4
-- ---------------------------------------------------------------------------

create table public.fades (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles (id) on delete cascade,
  receiver uuid not null references public.profiles (id) on delete cascade,
  sport text not null references public.sports (slug),
  intent text not null check (intent in ('technical', 'hard_sparring', 'drilling', 'hobby')),
  intensity text not null check (intensity in ('light', 'medium', 'hard')),
  rules text not null check (char_length(rules) between 2 and 200),
  rounds int not null check (rounds between 1 and 12),
  round_minutes int not null check (round_minutes between 1 and 10),
  gear text[] not null default '{}',
  venue_id uuid not null references public.venues (id),
  time_options timestamptz[] not null check (cardinality(time_options) between 1 and 3),
  chosen_time timestamptz,
  note text check (char_length(note) <= 300),
  note_flagged boolean not null default false,
  -- pending: waiting on receiver. accepted: receiver said yes and confirmed;
  -- waiting on sender's confirmation. on: both confirmed.
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'on', 'declined', 'cancelled', 'expired', 'done')),
  receiver_confirmed_at timestamptz,
  sender_confirmed_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  counter_of uuid references public.fades (id) on delete set null,
  expires_at timestamptz not null default now() + interval '48 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender <> receiver)
);

create index fades_sender on public.fades (sender, status);
create index fades_receiver on public.fades (receiver, status);
create unique index fades_one_open_per_pair on public.fades
  (least(sender, receiver), greatest(sender, receiver))
  where status in ('pending', 'accepted');

create table public.fade_feedback (
  fade_id uuid not null references public.fades (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  happened boolean not null,
  rating text check (rating in ('good', 'no_show', 'unsafe')),
  created_at timestamptz not null default now(),
  primary key (fade_id, author)
);

-- Marks stale requests expired. Called at the start of every fade RPC.
create or replace function public.expire_fades()
returns void
language sql security definer
set search_path = ''
as $$
  update public.fades set status = 'expired', updated_at = now()
  where status in ('pending', 'accepted')
    and (expires_at < now() or chosen_time < now());
$$;

create or replace function public.has_accepted_fade_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fades
    where ((sender = a and receiver = b) or (sender = b and receiver = a))
      and status in ('accepted', 'on', 'done')
  );
$$;

-- ---------------------------------------------------------------------------
-- Chat (SEC-C1 to C9): text only
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  flagged boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation on public.messages (conversation_id, created_at desc);

create or replace function public.conversation_other(cid uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select case when user_a = (select auth.uid()) then user_b else user_a end
  from public.conversations
  where id = cid and (select auth.uid()) in (user_a, user_b);
$$;

-- Chat is open only while the two are friends or share an accepted fade, and
-- neither has blocked the other.
create or replace function public.can_chat(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_active_user(a) and public.is_active_user(b)
     and not public.is_blocked_between(a, b)
     and (public.are_friends(a, b) or public.has_accepted_fade_between(a, b));
$$;

create or replace function public.is_conversation_member(cid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations
    where id = cid and (select auth.uid()) in (user_a, user_b)
  );
$$;

-- ---------------------------------------------------------------------------
-- Notifications, reports, gym confirmations, audit log
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'friend_request', 'friend_accepted', 'message',
    'fade_request', 'fade_countered', 'fade_accepted', 'fade_declined',
    'fade_on', 'fade_cancelled', 'gym_confirmed', 'gym_rejected'
  )),
  actor_id uuid references public.profiles (id) on delete cascade,
  fade_id uuid references public.fades (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  -- Push text: never message content (SEC-C9).
  title text not null,
  body text not null,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  target_user uuid not null references public.profiles (id) on delete cascade,
  fade_id uuid references public.fades (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null check (reason in (
    'threats', 'harassment', 'minor', 'money_or_betting', 'unsafe_conduct',
    'injury_or_assault', 'intimate_images', 'fake_gym', 'spam', 'other'
  )),
  details text check (char_length(details) <= 1000),
  -- Context for moderators (SEC-C7): the last 50 messages, kept with the report.
  chat_snapshot jsonb,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.gym_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_name text not null check (char_length(gym_name) between 2 and 80),
  gym_address text not null check (char_length(gym_address) between 5 and 160),
  coach_contact text check (char_length(coach_contact) <= 120),
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- SEC-A9: fade changes, blocks, reports and admin actions, kept one year.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target_user uuid,
  fade_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.audit(p_action text, p_target uuid default null, p_fade uuid default null, p_detail jsonb default null)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_log (actor, action, target_user, fade_id, detail)
  values ((select auth.uid()), p_action, p_target, p_fade, p_detail);
$$;

-- Simple per-user rate limits (SEC-L5, SEC-A3, SEC-C4).
create table public.rate_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup on public.rate_events (user_id, kind, created_at desc);

create or replace function public.rate_limit(p_kind text, p_max int, p_window interval, p_message text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.rate_events
      where user_id = (select auth.uid()) and kind = p_kind and created_at > now() - p_window) >= p_max then
    raise exception '%', p_message;
  end if;
  insert into public.rate_events (user_id, kind) values ((select auth.uid()), p_kind);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security: deny by default (SEC-R1). Other fighters are read only
-- through the RPCs below (SEC-R2), so most tables are owner-only.
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_status enable row level security;
alter table public.profile_private enable row level security;
alter table public.consents enable row level security;
alter table public.sports enable row level security;
alter table public.profile_sports enable row level security;
alter table public.blocks enable row level security;
alter table public.friendships enable row level security;
alter table public.venues enable row level security;
alter table public.fades enable row level security;
alter table public.fade_feedback enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.gym_confirmations enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_events enable row level security;

create policy profiles_own_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy status_own_read on public.profile_status for select to authenticated
  using (id = (select auth.uid()));

create policy private_own on public.profile_private for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy consents_own_read on public.consents for select to authenticated
  using (user_id = (select auth.uid()));

create policy sports_read on public.sports for select to authenticated using (true);

create policy profile_sports_own on public.profile_sports for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy blocks_own_read on public.blocks for select to authenticated
  using (blocker = (select auth.uid()));

create policy friendships_read on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

create policy venues_read on public.venues for select to authenticated
  using (approved or suggested_by = (select auth.uid()) or public.is_admin());

create policy fades_read on public.fades for select to authenticated
  using ((select auth.uid()) in (sender, receiver) and public.is_active_user((select auth.uid())));

create policy fade_feedback_own on public.fade_feedback for select to authenticated
  using (author = (select auth.uid()));

create policy conversations_read on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender = (select auth.uid())
    and public.is_conversation_member(conversation_id)
    and public.can_chat((select auth.uid()), public.conversation_other(conversation_id))
  );

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy reports_own on public.reports for select to authenticated
  using (reporter = (select auth.uid()));

create policy gym_confirmations_own on public.gym_confirmations for select to authenticated
  using (user_id = (select auth.uid()));

-- Table privileges: the app can only update its own profile's editable columns
-- and its own private row; everything else is read-only or RPC-only.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;
grant update (username, display_name, avatar_path, bio, area, weight_class, stance, pronouns, goals, gym_name, show_in_search)
  on public.profiles to authenticated;
grant update (push_token, muted_types) on public.profile_private to authenticated;
grant insert, delete on public.profile_sports to authenticated;
grant update (level, intent) on public.profile_sports to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications helper (internal)
-- ---------------------------------------------------------------------------

create or replace function public.display_name_of(uid uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(display_name, username, 'A fighter') from public.profiles where id = uid;
$$;

create or replace function public.notify(
  p_user uuid, p_type text, p_actor uuid, p_title text, p_body text,
  p_fade uuid default null, p_conversation uuid default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, actor_id, title, body, fade_id, conversation_id)
  values (p_user, p_type, p_actor, p_title, p_body, p_fade, p_conversation);
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding and consent
-- ---------------------------------------------------------------------------

create or replace function public.complete_profile(
  p_username text, p_display_name text, p_birth_date date, p_area text,
  p_weight_class text, p_terms_version text, p_privacy_version text, p_waiver_version text
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  existing date;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select birth_date into existing from public.profile_status where id = me;
  -- A birth date, once given, cannot be changed to get past the gate.
  if existing is not null and existing <> p_birth_date then
    raise exception 'Your date of birth is already set. Contact support to change it.';
  end if;
  if p_birth_date is null then raise exception 'Enter your date of birth.'; end if;
  if p_birth_date > (current_date - interval '18 years')::date then
    -- Saved (not raised) so a second try with another date is refused above.
    update public.profile_status set birth_date = p_birth_date where id = me;
    return 'underage';
  end if;
  if p_terms_version is null or p_privacy_version is null or p_waiver_version is null then
    raise exception 'Please accept the Terms, Privacy Policy and Waiver.';
  end if;
  if exists (select 1 from public.profiles where username = lower(p_username) and id <> me) then
    raise exception 'That username is taken.';
  end if;

  update public.profile_status set birth_date = p_birth_date where id = me;
  update public.profiles
     set username = lower(p_username), display_name = p_display_name,
         area = p_area, weight_class = p_weight_class, onboarded = true
   where id = me;
  insert into public.consents (user_id, document, version) values
    (me, 'terms', p_terms_version), (me, 'privacy', p_privacy_version), (me, 'waiver', p_waiver_version)
  on conflict do nothing;
  return 'ok';
end;
$$;

-- Re-accept documents after a version change.
create or replace function public.accept_documents(p_terms_version text, p_privacy_version text, p_waiver_version text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.consents (user_id, document, version) values
    ((select auth.uid()), 'terms', p_terms_version),
    ((select auth.uid()), 'privacy', p_privacy_version),
    ((select auth.uid()), 'waiver', p_waiver_version)
  on conflict do nothing;
$$;

-- SEC-L2/L6: snap to ~1 km and update at most every 3 hours.
create or replace function public.set_location(p_lat numeric, p_lng numeric)
returns void
language sql security definer
set search_path = ''
as $$
  update public.profile_private
     set lat = round(p_lat, 2), lng = round(p_lng, 2), location_updated_at = now()
   where id = (select auth.uid())
     and (location_updated_at is null or location_updated_at < now() - interval '3 hours');
$$;

create or replace function public.clear_location()
returns void
language sql security definer
set search_path = ''
as $$
  update public.profile_private set lat = null, lng = null, location_updated_at = null
  where id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Reading other fighters (SEC-R2, SEC-L4): safe columns, distance bands only.
-- ---------------------------------------------------------------------------

-- Miles, in bands only (SEC-L4).
create or replace function public.distance_band(km double precision)
returns text
language sql immutable
set search_path = ''
as $$
  select case when km is null then null
              when km < 4.8 then 'Under 3 mi'
              when km < 16 then '3 to 10 mi'
              when km < 40 then '10 to 25 mi'
              else '25+ mi' end;
$$;

create or replace function public.weight_index(w text)
returns int
language sql immutable
set search_path = ''
as $$
  select array_position(array['flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight',
    'middleweight', 'light_heavyweight', 'heavyweight'], w);
$$;

create or replace function public.km_between(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns double precision
language sql immutable
set search_path = ''
as $$
  select case when lat1 is null or lat2 is null then null else
    6371 * 2 * asin(sqrt(
      power(sin(radians((lat2 - lat1)::float8 / 2)), 2)
      + cos(radians(lat1::float8)) * cos(radians(lat2::float8))
        * power(sin(radians((lng2 - lng1)::float8 / 2)), 2)))
  end;
$$;

create type public.fighter_card as (
  id uuid,
  username text,
  display_name text,
  avatar_path text,
  bio text,
  area text,
  weight_class text,
  stance text,
  pronouns text,
  goals text[],
  gym_name text,
  gym_confirmed boolean,
  distance_band text,
  sports jsonb,
  friend_status text
);

create or replace function public.fighter_cards(p_ids uuid[])
returns setof public.fighter_card
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_path, p.bio, p.area, p.weight_class,
         p.stance, p.pronouns, p.goals, p.gym_name, s.gym_confirmed,
         public.distance_band(public.km_between(me.lat, me.lng, pp.lat, pp.lng)),
         coalesce((select jsonb_agg(jsonb_build_object('sport', ps.sport, 'level', ps.level, 'intent', ps.intent)
                                    order by ps.sport)
                   from public.profile_sports ps where ps.profile_id = p.id), '[]'::jsonb),
         (select case when f.status = 'accepted' then 'friends'
                      when f.requester = (select auth.uid()) then 'sent'
                      else 'received' end
            from public.friendships f
           where least(f.requester, f.addressee) = least(p.id, (select auth.uid()))
             and greatest(f.requester, f.addressee) = greatest(p.id, (select auth.uid())))
  from public.profiles p
  join public.profile_status s on s.id = p.id
  join public.profile_private pp on pp.id = p.id
  left join public.profile_private me on me.id = (select auth.uid())
  where p.id = any (p_ids)
    and public.is_active_user((select auth.uid()))
    and (p.id = (select auth.uid()) or (
      p.onboarded and s.banned_at is null and not s.hidden_for_review
      and not public.is_blocked_between((select auth.uid()), p.id)));
$$;

-- p_weight_class matches that class and the one on each side.
create or replace function public.find_fighters(
  p_sport text default null,
  p_max_miles int default 30,
  p_weight_class text default null,
  p_gym_confirmed_only boolean default false,
  p_friends_only boolean default false,
  p_level text default null
)
returns setof public.fighter_card
language plpgsql security definer
set search_path = ''
as $$
declare
  me public.profile_private;
  ids uuid[];
begin
  if not public.is_active_user((select auth.uid())) then return; end if;
  perform public.rate_limit('search', 30, interval '1 hour', 'Too many searches. Try again in a bit.');
  select * into me from public.profile_private where id = (select auth.uid());

  -- Random order inside each distance band so repeated searches can't rank exact distance.
  select array_agg(id) into ids from (
    select p.id
    from public.profiles p
    join public.profile_status s on s.id = p.id
    join public.profile_private pp on pp.id = p.id
    where p.id <> (select auth.uid())
      and p.onboarded and p.show_in_search and s.banned_at is null and not s.hidden_for_review
      and not public.is_blocked_between((select auth.uid()), p.id)
      and (not p_gym_confirmed_only or s.gym_confirmed)
      and (p_weight_class is null or abs(public.weight_index(p.weight_class) - public.weight_index(p_weight_class)) <= 1)
      and (p_sport is null or exists (
        select 1 from public.profile_sports ps where ps.profile_id = p.id and ps.sport = p_sport
          and (p_level is null or ps.level = p_level)))
      and (p_level is null or p_sport is not null or exists (
        select 1 from public.profile_sports ps where ps.profile_id = p.id and ps.level = p_level))
      and (not p_friends_only or public.are_friends((select auth.uid()), p.id))
      and (me.lat is null or pp.lat is null
           or public.km_between(me.lat, me.lng, pp.lat, pp.lng) <= p_max_miles * 1.609)
    order by public.distance_band(public.km_between(me.lat, me.lng, pp.lat, pp.lng)) nulls last, random()
    limit 100
  ) q;

  return query
    select c.* from public.fighter_cards(coalesce(ids, '{}')) c
    order by array_position(ids, c.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  f public.friendships;
begin
  select * into f from public.friendships
   where id = p_id and addressee = (select auth.uid()) and status = 'pending';
  if not found then raise exception 'Request not found.'; end if;
  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now() where id = p_id;
    perform public.notify(f.requester, 'friend_accepted', f.addressee,
      'Friend request accepted', public.display_name_of(f.addressee) || ' accepted your friend request');
  else
    delete from public.friendships where id = p_id;
  end if;
end;
$$;

create or replace function public.send_friend_request(p_target uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  existing public.friendships;
begin
  if not public.is_active_user(me) or not public.is_active_user(p_target)
     or public.is_blocked_between(me, p_target) or me = p_target then
    raise exception 'That fighter is not available.';
  end if;

  select * into existing from public.friendships
   where least(requester, addressee) = least(me, p_target)
     and greatest(requester, addressee) = greatest(me, p_target);

  if found then
    if existing.status = 'pending' and existing.addressee = me then
      perform public.respond_friend_request(existing.id, true);
      return 'friends';
    end if;
    return case when existing.status = 'accepted' then 'friends' else 'sent' end;
  end if;

  perform public.rate_limit('friend_request', 30, interval '1 day', 'Too many friend requests today. Try again tomorrow.');
  insert into public.friendships (requester, addressee) values (me, p_target);
  perform public.notify(p_target, 'friend_request', me,
    'New friend request', public.display_name_of(me) || ' wants to add you as a friend');
  return 'sent';
end;
$$;

create or replace function public.remove_friend(p_other uuid)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.friendships
  where (requester = (select auth.uid()) and addressee = p_other)
     or (requester = p_other and addressee = (select auth.uid()));
$$;

create or replace function public.my_friends()
returns table (friendship_id uuid, status text, direction text, card public.fighter_card)
language sql stable security definer
set search_path = ''
as $$
  select f.id, f.status,
         case when f.requester = (select auth.uid()) then 'sent' else 'received' end,
         c
  from public.friendships f
  cross join lateral public.fighter_cards(array[
    case when f.requester = (select auth.uid()) then f.addressee else f.requester end]) c
  where (select auth.uid()) in (f.requester, f.addressee)
  order by f.status, f.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

create or replace function public.open_conversation(p_other uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cid uuid;
begin
  if not public.can_chat(me, p_other) then
    raise exception 'You can message fighters once you are friends or have an accepted fade.';
  end if;
  insert into public.conversations (user_a, user_b)
  values (least(me, p_other), greatest(me, p_other))
  on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations
   where user_a = least(me, p_other) and user_b = greatest(me, p_other);
  return cid;
end;
$$;

create or replace function public.my_conversations()
returns table (
  conversation_id uuid, last_message_at timestamptz, last_body text,
  last_sender uuid, unread int, can_send boolean, card public.fighter_card
)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.last_message_at, lm.body, lm.sender,
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender <> (select auth.uid()) and m.read_at is null),
         public.can_chat(c.user_a, c.user_b),
         fc
  from public.conversations c
  cross join lateral public.fighter_cards(array[
    case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end]) fc
  left join lateral (
    select m.body, m.sender from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where (select auth.uid()) in (c.user_a, c.user_b)
    and exists (select 1 from public.messages m where m.conversation_id = c.id)
  order by c.last_message_at desc;
$$;

create or replace function public.on_message_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  other uuid;
begin
  perform public.rate_limit('message', 60, interval '1 minute', 'Slow down a little.');
  new.sender := (select auth.uid());
  new.flagged := public.has_money_words(new.body) or public.has_threat_words(new.body);
  new.read_at := null;
  new.created_at := now();
  other := public.conversation_other(new.conversation_id);
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  perform public.notify(other, 'message', new.sender,
    'New message', 'New message from ' || public.display_name_of(new.sender),
    null, new.conversation_id);
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.on_message_insert();

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_conversation_member(p_conversation) then return; end if;
  update public.messages set read_at = now()
   where conversation_id = p_conversation and sender <> (select auth.uid()) and read_at is null;
  update public.notifications set read_at = now()
   where user_id = (select auth.uid()) and conversation_id = p_conversation and read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fades
-- ---------------------------------------------------------------------------

create or replace function public.fade_title(p_sport text, p_intensity text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select (select name from public.sports where slug = p_sport) || ', ' || p_intensity;
$$;

create or replace function public.send_fade(
  p_receiver uuid, p_sport text, p_intent text, p_intensity text, p_rules text,
  p_rounds int, p_round_minutes int, p_gear text[], p_venue uuid,
  p_time_options timestamptz[], p_note text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  fid uuid;
  declines int;
  last_decline timestamptz;
  account_age interval;
begin
  perform public.expire_fades();
  if not public.is_active_user(me) or not public.is_active_user(p_receiver)
     or public.is_blocked_between(me, p_receiver) or me = p_receiver then
    raise exception 'That fighter is not available.';
  end if;
  if not exists (select 1 from public.venues where id = p_venue and approved) then
    raise exception 'Pick an approved gym or training venue.';
  end if;
  if exists (select 1 from unnest(p_time_options) t where t < now() + interval '1 hour') then
    raise exception 'Pick times at least an hour from now.';
  end if;
  if exists (select 1 from public.fades
             where least(sender, receiver) = least(me, p_receiver)
               and greatest(sender, receiver) = greatest(me, p_receiver)
               and status in ('pending', 'accepted')) then
    raise exception 'You already have an open fade with this fighter.';
  end if;

  -- SEC-A2: 30-day cooldown after a decline, none after a second.
  select count(*), max(updated_at) into declines, last_decline from public.fades
   where sender = me and receiver = p_receiver and status = 'declined';
  if declines >= 2 then
    raise exception 'That fighter is not available.';
  elsif declines = 1 and last_decline > now() - interval '30 days' then
    raise exception 'That fighter is not available right now.';
  end if;

  -- SEC-A3: 20 a day, 5 a day for accounts under 7 days old.
  select now() - created_at into account_age from public.profiles where id = me;
  if account_age < interval '7 days' then
    perform public.rate_limit('fade', 5, interval '1 day', 'New accounts can send 5 fade requests a day.');
  else
    perform public.rate_limit('fade', 20, interval '1 day', 'You can send 20 fade requests a day.');
  end if;

  insert into public.fades (sender, receiver, sport, intent, intensity, rules, rounds, round_minutes,
                            gear, venue_id, time_options, note, note_flagged)
  values (me, p_receiver, p_sport, p_intent, p_intensity, p_rules, p_rounds, p_round_minutes,
          coalesce(p_gear, '{}'), p_venue, p_time_options, nullif(trim(p_note), ''),
          public.has_money_words(p_note) or public.has_threat_words(p_note))
  returning id into fid;

  perform public.audit('fade_sent', p_receiver, fid);
  perform public.notify(p_receiver, 'fade_request', me, 'New fade request',
    public.display_name_of(me) || ' sent you a fade request: ' || public.fade_title(p_sport, p_intensity), fid);
  return fid;
end;
$$;

-- Receiver's answer. 'accept' needs a chosen time and both acknowledgments;
-- 'counter' declines this request and sends a new one back with the changes.
create or replace function public.respond_fade(
  p_fade uuid, p_action text,
  p_time timestamptz default null, p_ack_risk boolean default false, p_ack_safety boolean default false,
  p_venue uuid default null, p_intensity text default null,
  p_time_options timestamptz[] default null, p_note text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  f public.fades;
  new_id uuid;
begin
  perform public.expire_fades();
  select * into f from public.fades where id = p_fade for update;
  if not found or f.receiver <> me then raise exception 'Fade not found.'; end if;
  if f.status <> 'pending' then raise exception 'This fade is no longer waiting on you.'; end if;
  if public.is_blocked_between(f.sender, me) then raise exception 'That fighter is not available.'; end if;

  if p_action = 'decline' then
    -- Declines are quiet: no notification; the sender sees "Not this time".
    update public.fades set status = 'declined', updated_at = now() where id = p_fade;
    perform public.audit('fade_declined', f.sender, p_fade);
    return p_fade;

  elsif p_action = 'accept' then
    if not coalesce(p_ack_risk, false) or not coalesce(p_ack_safety, false) then
      raise exception 'Confirm the waiver and the safety checklist to accept.';
    end if;
    if p_time is null or not (p_time = any (f.time_options)) or p_time < now() then
      raise exception 'Pick one of the proposed times.';
    end if;
    update public.fades
       set status = 'accepted', chosen_time = p_time, receiver_confirmed_at = now(),
           expires_at = p_time, updated_at = now()
     where id = p_fade;
    perform public.audit('fade_accepted', f.sender, p_fade);
    perform public.notify(f.sender, 'fade_accepted', me, 'Fade accepted',
      public.display_name_of(me) || ' accepted. Confirm to lock it in.', p_fade);
    return p_fade;

  elsif p_action = 'counter' then
    update public.fades set status = 'declined', updated_at = now() where id = p_fade;
    if p_venue is not null and not exists (select 1 from public.venues where id = p_venue and approved) then
      raise exception 'Pick an approved gym or training venue.';
    end if;
    if p_time_options is not null and (cardinality(p_time_options) not between 1 and 3
        or exists (select 1 from unnest(p_time_options) t where t < now() + interval '1 hour')) then
      raise exception 'Give one to three times at least an hour from now.';
    end if;
    insert into public.fades (sender, receiver, sport, intent, intensity, rules, rounds, round_minutes,
                              gear, venue_id, time_options, note, note_flagged, counter_of)
    values (me, f.sender, f.sport, f.intent, coalesce(p_intensity, f.intensity), f.rules, f.rounds,
            f.round_minutes, f.gear, coalesce(p_venue, f.venue_id), coalesce(p_time_options, f.time_options),
            coalesce(nullif(trim(p_note), ''), f.note),
            public.has_money_words(coalesce(nullif(trim(p_note), ''), f.note))
              or public.has_threat_words(coalesce(nullif(trim(p_note), ''), f.note)),
            p_fade)
    returning id into new_id;
    perform public.audit('fade_countered', f.sender, new_id);
    perform public.notify(f.sender, 'fade_countered', me, 'Changes suggested',
      public.display_name_of(me) || ' suggested changes to your fade', new_id);
    return new_id;
  end if;
  raise exception 'Unknown action.';
end;
$$;

-- Sender's confirmation after the receiver accepts. Then the fade is on.
create or replace function public.confirm_fade(p_fade uuid, p_ack_risk boolean, p_ack_safety boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  f public.fades;
begin
  perform public.expire_fades();
  if not coalesce(p_ack_risk, false) or not coalesce(p_ack_safety, false) then
    raise exception 'Confirm the waiver and the safety checklist.';
  end if;
  select * into f from public.fades where id = p_fade for update;
  if not found or f.sender <> me then raise exception 'Fade not found.'; end if;
  if f.status <> 'accepted' then raise exception 'This fade is not ready to confirm.'; end if;
  if public.is_blocked_between(f.receiver, me) then raise exception 'That fighter is not available.'; end if;

  update public.fades set status = 'on', sender_confirmed_at = now(), updated_at = now() where id = p_fade;
  perform public.audit('fade_on', f.receiver, p_fade);
  perform public.notify(f.receiver, 'fade_on', me, 'Fade is on',
    'Your fade with ' || public.display_name_of(me) || ' is confirmed', p_fade);
  perform public.notify(me, 'fade_on', f.receiver, 'Fade is on',
    'Your fade with ' || public.display_name_of(f.receiver) || ' is confirmed', p_fade);
end;
$$;

-- Either fighter can cancel at any time, no reason needed.
create or replace function public.cancel_fade(p_fade uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  f public.fades;
  other uuid;
begin
  select * into f from public.fades where id = p_fade for update;
  if not found or me not in (f.sender, f.receiver) then raise exception 'Fade not found.'; end if;
  if f.status not in ('pending', 'accepted', 'on') then raise exception 'This fade is already closed.'; end if;
  other := case when me = f.sender then f.receiver else f.sender end;
  update public.fades set status = 'cancelled', cancelled_by = me, updated_at = now() where id = p_fade;
  perform public.audit('fade_cancelled', other, p_fade);
  perform public.notify(other, 'fade_cancelled', me, 'Fade cancelled',
    public.display_name_of(me) || ' cancelled the fade', p_fade);
end;
$$;

create or replace function public.leave_fade_feedback(p_fade uuid, p_happened boolean, p_rating text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  f public.fades;
begin
  select * into f from public.fades where id = p_fade;
  if not found or (select auth.uid()) not in (f.sender, f.receiver) then raise exception 'Fade not found.'; end if;
  if f.status not in ('on', 'done') then raise exception 'Only confirmed fades get feedback.'; end if;
  if f.chosen_time > now() then raise exception 'Leave feedback after the fade.'; end if;
  insert into public.fade_feedback (fade_id, author, happened, rating)
  values (p_fade, (select auth.uid()), p_happened, p_rating)
  on conflict (fade_id, author) do update set happened = excluded.happened, rating = excluded.rating;
  update public.fades set status = 'done', updated_at = now() where id = p_fade and status = 'on';
end;
$$;

-- Fade details for one of its two fighters. The gym address only once it is on.
create or replace function public.fade_details(p_fade uuid)
returns table (
  id uuid, status text, i_am text, sport text, sport_name text, intent text, intensity text,
  rules text, rounds int, round_minutes int, gear text[], time_options timestamptz[],
  chosen_time timestamptz, note text, note_flagged boolean, venue_name text, venue_city text,
  venue_address text, receiver_confirmed boolean, sender_confirmed boolean, expires_at timestamptz,
  created_at timestamptz, my_feedback boolean, other public.fighter_card
)
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.expire_fades();
  return query
  select f.id, f.status, case when f.sender = (select auth.uid()) then 'sender' else 'receiver' end,
         f.sport, sp.name, f.intent, f.intensity, f.rules, f.rounds, f.round_minutes, f.gear,
         f.time_options, f.chosen_time, f.note, f.note_flagged, v.name, v.city,
         case when f.status in ('on', 'done') then v.address end,
         f.receiver_confirmed_at is not null, f.sender_confirmed_at is not null, f.expires_at,
         f.created_at,
         exists (select 1 from public.fade_feedback fb where fb.fade_id = f.id and fb.author = (select auth.uid())),
         (select c from public.fighter_cards(array[
            case when f.sender = (select auth.uid()) then f.receiver else f.sender end]) c)
  from public.fades f
  join public.venues v on v.id = f.venue_id
  join public.sports sp on sp.slug = f.sport
  where f.id = p_fade and (select auth.uid()) in (f.sender, f.receiver);
end;
$$;

create or replace function public.my_fades()
returns table (
  id uuid, status text, i_am text, sport_name text, intensity text, chosen_time timestamptz,
  time_options timestamptz[], venue_name text, updated_at timestamptz, other public.fighter_card
)
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.expire_fades();
  return query
  select f.id, f.status, case when f.sender = (select auth.uid()) then 'sender' else 'receiver' end,
         sp.name, f.intensity, f.chosen_time, f.time_options, v.name, f.updated_at,
         (select c from public.fighter_cards(array[
            case when f.sender = (select auth.uid()) then f.receiver else f.sender end]) c)
  from public.fades f
  join public.venues v on v.id = f.venue_id
  join public.sports sp on sp.slug = f.sport
  where (select auth.uid()) in (f.sender, f.receiver)
    and not public.is_blocked_between(f.sender, f.receiver)
  order by f.updated_at desc
  limit 200;
end;
$$;

create or replace function public.list_venues(p_search text default null)
returns table (id uuid, name text, city text)
language sql stable security definer
set search_path = ''
as $$
  select id, name, city from public.venues
  where approved and (p_search is null or name ilike '%' || p_search || '%' or city ilike '%' || p_search || '%')
  order by name limit 50;
$$;

create or replace function public.suggest_venue(p_name text, p_address text, p_city text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  vid uuid;
begin
  perform public.rate_limit('venue', 5, interval '1 day', 'Too many suggestions today.');
  insert into public.venues (name, address, city, suggested_by)
  values (p_name, p_address, p_city, (select auth.uid())) returning id into vid;
  return vid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Safety: block, report (SEC-A5, A7)
-- ---------------------------------------------------------------------------

create or replace function public.block_user(p_target uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if p_target = me then raise exception 'You cannot block yourself.'; end if;
  insert into public.blocks (blocker, blocked) values (me, p_target) on conflict do nothing;
  delete from public.friendships
   where (requester = me and addressee = p_target) or (requester = p_target and addressee = me);
  update public.fades set status = 'cancelled', cancelled_by = me, updated_at = now()
   where ((sender = me and receiver = p_target) or (sender = p_target and receiver = me))
     and status in ('pending', 'accepted', 'on');
  -- Silent: the blocked fighter gets no notification, and old ones from them go away.
  delete from public.notifications where user_id = me and actor_id = p_target;
  perform public.audit('block', p_target);
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.blocks where blocker = (select auth.uid()) and blocked = p_target;
$$;

create or replace function public.my_blocks()
returns table (user_id uuid, display_name text, username text, blocked_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.username, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked
  where b.blocker = (select auth.uid())
  order by b.created_at desc;
$$;

create or replace function public.report_user(
  p_target uuid, p_reason text, p_details text default null,
  p_fade uuid default null, p_message uuid default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cid uuid;
  snapshot jsonb;
begin
  perform public.rate_limit('report', 20, interval '1 day', 'Too many reports today. Email support if this is urgent.');
  select id into cid from public.conversations
   where user_a = least(me, p_target) and user_b = greatest(me, p_target);
  if cid is not null then
    select jsonb_agg(jsonb_build_object('id', m.id, 'sender', m.sender, 'body', m.body, 'at', m.created_at)
                     order by m.created_at)
      into snapshot
      from (select * from public.messages where conversation_id = cid order by created_at desc limit 50) m;
  end if;
  insert into public.reports (reporter, target_user, reason, details, fade_id, message_id, chat_snapshot)
  values (me, p_target, p_reason, p_details, p_fade, p_message, snapshot);
  perform public.audit('report', p_target, p_fade, jsonb_build_object('reason', p_reason));

  -- Three different reporters hide a profile until an admin reviews it.
  if (select count(distinct reporter) from public.reports where target_user = p_target and status = 'open') >= 3 then
    update public.profile_status set hidden_for_review = true where id = p_target;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gym confirmation (SEC-U1 to U7)
-- ---------------------------------------------------------------------------

create or replace function public.request_gym_confirmation(
  p_gym_name text, p_gym_address text, p_coach_contact text, p_proof_path text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_proof_path is not null and p_proof_path not like (select auth.uid())::text || '/%' then
    raise exception 'Upload the proof first.';
  end if;
  if p_proof_path is null and coalesce(trim(p_coach_contact), '') = '' then
    raise exception 'Add a photo of proof or a coach''s contact.';
  end if;
  if exists (select 1 from public.gym_confirmations where user_id = (select auth.uid()) and status = 'pending') then
    raise exception 'You already have a request waiting for review.';
  end if;
  insert into public.gym_confirmations (user_id, gym_name, gym_address, coach_contact, proof_path)
  values ((select auth.uid()), p_gym_name, p_gym_address, p_coach_contact, p_proof_path);
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (SEC-AU6, SEC-C8)
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'Not signed in'; end if;
  -- Keep messages that are part of an open report (copied into the report already).
  delete from storage.objects where bucket_id in ('avatars', 'gym-proofs')
    and (storage.foldername(name))[1] = me::text;
  insert into public.audit_log (actor, action) values (me, 'account_deleted');
  delete from auth.users where id = me;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin (SEC-AU7, SEC-U2, SEC-U6)
-- ---------------------------------------------------------------------------

create or replace function public.admin_queue()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return jsonb_build_object(
    'reports', coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'target_name', public.display_name_of(r.target_user),
        'reporter_name', public.display_name_of(r.reporter)) order by r.created_at)
      from public.reports r where r.status = 'open'), '[]'),
    'gyms', coalesce((select jsonb_agg(to_jsonb(g) || jsonb_build_object(
        'user_name', public.display_name_of(g.user_id)) order by g.created_at)
      from public.gym_confirmations g where g.status = 'pending'), '[]'),
    'venues', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at)
      from public.venues v where not v.approved), '[]'),
    'flagged_messages', (select count(*) from public.messages where flagged and created_at > now() - interval '7 days')
  );
end;
$$;

-- Logged before the app asks Storage for a 5-minute signed URL.
create or replace function public.admin_log_proof_view(p_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  path text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select proof_path into path from public.gym_confirmations where id = p_id;
  perform public.audit('admin_view_proof', null, null, jsonb_build_object('gym_confirmation', p_id));
  return path;
end;
$$;

create or replace function public.admin_review_gym(p_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  g public.gym_confirmations;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.gym_confirmations
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = (select auth.uid()), reviewed_at = now(), proof_path = null
   where id = p_id and status = 'pending'
  returning * into g;
  if not found then raise exception 'Request not found.'; end if;
  -- The proof file is deleted as soon as there is a decision.
  delete from storage.objects o using public.gym_confirmations x
   where x.id = p_id and o.bucket_id = 'gym-proofs' and (storage.foldername(o.name))[1] = g.user_id::text;
  if p_approve then
    update public.profile_status set gym_confirmed = true, gym_confirmed_at = now() where id = g.user_id;
    update public.profiles set gym_name = g.gym_name where id = g.user_id;
    perform public.notify(g.user_id, 'gym_confirmed', null, 'Gym confirmed', 'Your gym is confirmed: ' || g.gym_name);
  else
    perform public.notify(g.user_id, 'gym_rejected', null, 'Gym not confirmed',
      'We couldn''t confirm your gym. You can try again with clearer proof.');
  end if;
  perform public.audit(case when p_approve then 'admin_gym_approved' else 'admin_gym_rejected' end, g.user_id);
end;
$$;

create or replace function public.admin_review_venue(p_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_approve then update public.venues set approved = true where id = p_id;
  else delete from public.venues where id = p_id and not approved; end if;
  perform public.audit('admin_venue', null, null, jsonb_build_object('venue', p_id, 'approved', p_approve));
end;
$$;

create or replace function public.admin_resolve_report(p_id uuid, p_action text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  r public.reports;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_action not in ('dismiss', 'ban', 'unhide', 'remove_gym_badge') then raise exception 'Unknown action.'; end if;
  update public.reports set status = case when p_action in ('dismiss', 'unhide') then 'dismissed' else 'actioned' end
   where id = p_id returning * into r;
  if not found then raise exception 'Report not found.'; end if;
  if p_action = 'ban' then
    update public.profile_status set banned_at = now() where id = r.target_user;
    update public.fades set status = 'cancelled', updated_at = now()
     where r.target_user in (sender, receiver) and status in ('pending', 'accepted', 'on');
  elsif p_action = 'unhide' then
    update public.profile_status set hidden_for_review = false where id = r.target_user;
  elsif p_action = 'remove_gym_badge' then
    update public.profile_status set gym_confirmed = false where id = r.target_user;
  end if;
  perform public.audit('admin_report_' || p_action, r.target_user, r.fade_id, jsonb_build_object('report', p_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Function access: only the app-facing RPCs are callable.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.complete_profile(text, text, date, text, text, text, text, text),
  public.accept_documents(text, text, text),
  public.set_location(numeric, numeric),
  public.clear_location(),
  public.fighter_cards(uuid[]),
  public.find_fighters(text, int, text, boolean, boolean, text),
  public.send_friend_request(uuid),
  public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid),
  public.my_friends(),
  public.open_conversation(uuid),
  public.my_conversations(),
  public.mark_conversation_read(uuid),
  public.send_fade(uuid, text, text, text, text, int, int, text[], uuid, timestamptz[], text),
  public.respond_fade(uuid, text, timestamptz, boolean, boolean, uuid, text, timestamptz[], text),
  public.confirm_fade(uuid, boolean, boolean),
  public.cancel_fade(uuid),
  public.leave_fade_feedback(uuid, boolean, text),
  public.fade_details(uuid),
  public.my_fades(),
  public.list_venues(text),
  public.suggest_venue(text, text, text),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.my_blocks(),
  public.report_user(uuid, text, text, uuid, uuid),
  public.request_gym_confirmation(text, text, text, text),
  public.delete_my_account(),
  public.is_admin(),
  public.admin_queue(),
  public.admin_log_proof_view(uuid),
  public.admin_review_gym(uuid, boolean),
  public.admin_review_venue(uuid, boolean),
  public.admin_resolve_report(uuid, text)
to authenticated;

-- RLS policies call these as the signed-in user.
grant execute on function
  public.is_blocked_between(uuid, uuid),
  public.is_conversation_member(uuid),
  public.is_active_user(uuid),
  public.can_chat(uuid, uuid),
  public.conversation_other(uuid)
to authenticated;

-- Notifications are marked read through this, not a table update.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql security definer
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null and (p_ids is null or id = any (p_ids));
$$;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (SEC-C5): postgres_changes on RLS-protected tables only.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages, public.notifications;

-- ---------------------------------------------------------------------------
-- Storage: avatars are public-read; gym proofs private (SEC-U1, U3).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png']),
  ('gym-proofs', 'gym-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy gym_proofs_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'gym-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy gym_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'gym-proofs'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
