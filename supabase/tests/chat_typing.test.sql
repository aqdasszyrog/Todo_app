-- Who may join and send on a chat's typing channel, `chat:<task id>`.
-- Run with `npm run test:db` (needs Docker: it starts a local Supabase).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.io',    '{"name": "Owner"}'),
  ('22222222-2222-2222-2222-222222222222', 'member@test.io',   '{"name": "Member"}'),
  ('33333333-3333-3333-3333-333333333333', 'invitee@test.io',  '{"name": "Invitee"}'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@test.io', '{"name": "Stranger"}');

create temp table ctx (task_id bigint);
grant all on ctx to authenticated;

create function pg_temp.act_as(p_user uuid, p_topic text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true),
         set_config('realtime.topic', p_topic, true);
$$;

-- What Realtime does when a client sends on (or joins) the channel.
create function pg_temp.send_typing() returns void language sql as $$
  insert into realtime.messages (topic, extension, event, payload, private)
  values ((select realtime.topic()), 'broadcast', 'typing', '{}', true);
$$;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', '');
set local role authenticated;
insert into ctx select public.create_shared_task('Plan trip', 'medium', null, array['member@test.io', 'invitee@test.io']);

reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', '');
set local role authenticated;
select public.respond_to_invite((select task_id from ctx), true);

-- Member: may send and receive.
reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'chat:' || (select task_id from ctx));
set local role authenticated;

select lives_ok($$ select pg_temp.send_typing() $$, 'an accepted member can send typing in the chat');
select isnt_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'an accepted member can receive typing in the chat'
);

-- Owner: may receive.
reset role;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'chat:' || (select task_id from ctx));
set local role authenticated;

select isnt_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'the owner can receive typing in the chat'
);

-- Invitee (not yet accepted) and stranger: neither.
reset role;
select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'chat:' || (select task_id from ctx));
set local role authenticated;

select throws_ok($$ select pg_temp.send_typing() $$, '42501', null, 'an invited user can''t send typing');
select is_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'an invited user can''t join the chat channel'
);

reset role;
select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'chat:' || (select task_id from ctx));
set local role authenticated;

select is_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'a stranger can''t join the chat channel'
);

-- Malformed chat topics are refused, and personal topics stay send-proof.
reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'chat:abc');
set local role authenticated;

select throws_ok($$ select pg_temp.send_typing() $$, '42501', null, 'a malformed chat topic is refused');

reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'user:22222222-2222-2222-2222-222222222222');
set local role authenticated;

select throws_ok($$ select pg_temp.send_typing() $$, '42501', null,
  'clients still can''t send on personal topics');

reset role;
select * from finish();
rollback;
