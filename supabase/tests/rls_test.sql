-- Security tests for the Fadez2Go schema (SEC-R8 and the pre-launch checklist).
-- Run after supabase_stub.sql and the migrations: scripts/test-db.sh.
-- Every check raises on failure, so psql -v ON_ERROR_STOP=1 exits non-zero.

\set ON_ERROR_STOP 1
\o /dev/null
set client_min_messages = warning;

create schema test;
grant usage on schema test to anon, authenticated;

create function test.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end;
$$;

create function test.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL: % (expected an error, statement succeeded)', label;
exception
  when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  when others then null;
end;
$$;

create function test.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
end;
$$;

grant execute on all functions in schema test to anon, authenticated;

-- Fixtures (as superuser) -------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test'),
  ('00000000-0000-0000-0000-00000000000d', 'minor@test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000ad');
insert into public.venues (id, name, address, city, approved) values
  ('11111111-1111-1111-1111-111111111111', 'Test Gym', '1 Main St, Atlanta GA', 'Atlanta', true),
  ('22222222-2222-2222-2222-222222222222', 'Unapproved Spot', '2 Side St, Atlanta GA', 'Atlanta', false);

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
\set ADMIN '''00000000-0000-0000-0000-0000000000ad'''

-- Onboarding and the 18+ gate (SEC-AU5) -------------------------------------------

select test.act_as(:A);
select public.complete_profile('alpha', 'Alpha', '1995-01-01', 'Midtown', 'welterweight', 't1', 'p1', 'w1');
select public.set_location(33.78123, -84.38456);
select test.act_as(:B);
select public.complete_profile('bravo', 'Bravo', '1998-05-05', 'Decatur', 'welterweight', 't1', 'p1', 'w1');
select public.set_location(33.77, -84.30);
select test.act_as(:C);
select public.complete_profile('charlie', 'Charlie', '1990-02-02', 'Marietta', 'heavyweight', 't1', 'p1', 'w1');
select test.act_as(:ADMIN);
select public.complete_profile('admin', 'Admin', '1985-02-02', 'Atlanta', 'heavyweight', 't1', 'p1', 'w1');

select test.act_as(:D);
select test.ok(public.complete_profile('kid', 'Kid', (current_date - interval '16 years')::date, 'X', 'lightweight', 't1', 'p1', 'w1') = 'underage',
  'under-18 sign-up is refused');
select test.ok(not public.is_active_user(auth.uid()), 'under-18 account is not active');
select test.expect_error($$select public.complete_profile('kid', 'Kid', '1990-01-01', 'X', 'lightweight', 't1', 'p1', 'w1')$$,
  'birth date cannot be changed to get past the gate');

reset role;
select test.ok((select lat from public.profile_private where id = :A) = 33.78, 'location is snapped to 2 decimals');
select test.ok((select count(*) from public.consents where user_id = :A) = 3, 'three consents recorded');

-- Anonymous access returns nothing (T2) -------------------------------------------

select test.act_as(null);
select test.expect_error('select * from public.profiles', 'anon cannot read profiles');
select test.expect_error('select * from public.messages', 'anon cannot read messages');
select test.expect_error('select public.find_fighters()', 'anon cannot search');

-- Raw rows of other users are hidden (SEC-R2) --------------------------------------

select test.act_as(:B);
select test.ok((select count(*) from public.profiles) = 1, 'B sees only own profile row');
select test.ok((select count(*) from public.profile_private) = 1, 'B sees only own private row');
select test.ok((select count(*) from public.profile_status) = 1, 'B sees only own status row');

-- Privileged fields are not writable (SEC-R4) --------------------------------------

select test.expect_error($$update public.profile_status set gym_confirmed = true$$, 'user cannot set gym_confirmed');
select test.expect_error($$update public.profile_status set banned_at = null$$, 'user cannot touch banned');
select test.expect_error($$insert into public.admin_users values ('00000000-0000-0000-0000-00000000000b')$$, 'user cannot make themselves admin');
select test.expect_error($$insert into public.notifications (user_id, type, title, body) values ('00000000-0000-0000-0000-00000000000a', 'message', 'x', 'y')$$, 'user cannot write notifications');
update public.profiles set bio = 'Muay Thai, 3 years' where id = :B;
select test.ok((select bio from public.profiles where id = :B) = 'Muay Thai, 3 years', 'user can edit own bio');

-- Search returns bands only (SEC-L4) -----------------------------------------------

select test.act_as(:A);
select test.ok((select count(*) from public.find_fighters()) = 3, 'A finds the three other adults');
select test.ok((select distance_band from public.find_fighters() where id = :B) = '3 to 10 mi', 'distance is a band');
select test.ok(not exists (
  select 1 from information_schema.attributes
  where udt_name = 'fighter_card' and attribute_name in ('lat', 'lng', 'birth_date')), 'fighter card has no coordinates or birth date');

-- Chat needs friendship or an accepted fade (SEC-C1) -------------------------------

select test.expect_error($$select public.open_conversation('00000000-0000-0000-0000-00000000000b')$$, 'no chat with a stranger');
select public.send_friend_request(:B);
select test.act_as(:B);
select test.ok((select count(*) from public.notifications where type = 'friend_request') = 1, 'B is notified of the friend request');
select public.respond_friend_request((select id from public.friendships limit 1), true);
select test.act_as(:A);
select public.open_conversation(:B) as cid \gset
insert into public.messages (conversation_id, body) values (:'cid', 'Want to spar Saturday?');
insert into public.messages (conversation_id, body) values (:'cid', 'Loser pays $50 lol');
select test.ok((select flagged from public.messages where body like 'Loser%'), 'money words are flagged');
select test.act_as(:B);
select test.ok((select count(*) from public.messages) = 2, 'B reads the conversation');
select test.ok(not exists (select 1 from public.notifications where body like '%Saturday%'), 'push text never contains the message');
select test.act_as(:C);
select test.ok((select count(*) from public.messages) = 0, 'C cannot read A and B''s messages');
select test.expect_error(format($$insert into public.messages (conversation_id, body) values (%L, 'hi')$$, :'cid'), 'C cannot post into A and B''s chat');

-- Fades: consent both ways (SEC-A1, A2) --------------------------------------------

select test.act_as(:A);
select test.expect_error($$select public.send_fade('00000000-0000-0000-0000-00000000000b', 'muay_thai', 'technical', 'light', 'Thai rules, light contact', 3, 3, '{gloves}', '22222222-2222-2222-2222-222222222222', array[now() + interval '2 days'], null)$$,
  'fade at an unapproved venue is refused');
select public.send_fade(:B, 'muay_thai', 'technical', 'light', 'Thai rules, light contact', 3, 3, '{gloves,shin_guards}',
  '11111111-1111-1111-1111-111111111111', array[date_trunc('hour', now()) + interval '2 days'], 'Bring a mouthguard') as fid \gset
select test.expect_error($$select public.send_fade('00000000-0000-0000-0000-00000000000b', 'boxing', 'technical', 'light', 'Boxing', 3, 3, '{}', '11111111-1111-1111-1111-111111111111', array[now() + interval '3 days'], null)$$,
  'only one open fade per pair');
select test.expect_error(format($$select public.respond_fade(%L, 'accept', now() + interval '2 days', true, true)$$, :'fid'), 'sender cannot accept own fade');

select test.act_as(:C);
select test.ok((select count(*) from public.fades) = 0, 'a third fighter cannot see the fade');
select test.ok((select count(*) from public.fade_details(:'fid')) = 0, 'a third fighter gets no fade details');

select test.act_as(:B);
select test.ok((select venue_address from public.fade_details(:'fid')) is null, 'gym address hidden until the fade is on');
select test.expect_error(format($$select public.respond_fade(%L, 'accept', (select time_options[1] from public.fades where id = %L), false, true)$$, :'fid', :'fid'),
  'accepting needs the waiver acknowledgment');
select public.respond_fade(:'fid', 'accept', (select time_options[1] from public.fades where id = :'fid'), true, true);
select test.ok((select status from public.fades where id = :'fid') = 'accepted', 'accepted is not yet on');

select test.act_as(:A);
select public.confirm_fade(:'fid', true, true);
select test.ok((select status from public.fades where id = :'fid') = 'on', 'on after both confirm');
select test.ok((select venue_address from public.fade_details(:'fid')) is not null, 'gym address shown once on');
select public.cancel_fade(:'fid');
select test.ok((select status from public.fades where id = :'fid') = 'cancelled', 'either side can cancel');

-- Decline cooldown
select public.send_fade(:B, 'boxing', 'technical', 'light', 'Boxing, light', 3, 3, '{}',
  '11111111-1111-1111-1111-111111111111', array[now() + interval '3 days'], null) as fid2 \gset
select test.act_as(:B);
select public.respond_fade(:'fid2', 'decline');
select test.act_as(:A);
select test.expect_error($$select public.send_fade('00000000-0000-0000-0000-00000000000b', 'boxing', 'technical', 'light', 'Boxing', 3, 3, '{}', '11111111-1111-1111-1111-111111111111', array[now() + interval '4 days'], null)$$,
  'no repeat fade within 30 days of a decline');

-- Block is instant and two-way (SEC-A5) --------------------------------------------

select test.act_as(:B);
select public.block_user(:A);
select test.ok(not exists (select 1 from public.find_fighters() where id = :A), 'blocked fighter is gone from B''s search');
select test.act_as(:A);
select test.ok(not exists (select 1 from public.find_fighters() where id = :B), 'blocker is gone from A''s search');
select test.expect_error(format($$insert into public.messages (conversation_id, body) values (%L, 'hello?')$$, :'cid'), 'no messages after a block');
select test.ok((select count(*) from public.friendships) = 0, 'block ends the friendship');
select test.ok(not exists (select 1 from public.notifications where user_id = :A and type = 'fade_cancelled' and body like '%block%'), 'blocked fighter is not told');

-- Reports and admin (SEC-A7, AU7) --------------------------------------------------

select test.act_as(:B);
select public.report_user(:A, 'money_or_betting', 'Offered money');
select test.ok((select jsonb_array_length(chat_snapshot) from public.reports limit 1) = 2, 'report keeps chat context');
select test.expect_error('select public.admin_queue()', 'non-admin cannot open the admin queue');
select test.act_as(:ADMIN);
select test.ok(jsonb_array_length(public.admin_queue() -> 'reports') = 1, 'admin sees the report');
select public.admin_resolve_report((public.admin_queue() -> 'reports' -> 0 ->> 'id')::uuid, 'ban');
reset role;
select test.ok((select banned_at is not null from public.profile_status where id = :A), 'ban applied');
select test.act_as(:C);
select test.ok(not exists (select 1 from public.find_fighters() where id = :A), 'banned fighter is hidden');

-- Account deletion (SEC-AU6) -------------------------------------------------------

select test.act_as(:C);
select public.delete_my_account();
reset role;
select test.ok(not exists (select 1 from public.profiles where id = :C), 'account deletion removes the profile');

\o
\echo 'All security tests passed.'
