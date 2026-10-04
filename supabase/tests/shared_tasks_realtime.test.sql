-- Shared tasks, chat RLS and broadcast routing.
-- Run with `npm run test:db` (needs Docker: it starts a local Supabase).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- ------------------------------------------------------------
-- Setup: owner creates a task and invites member + invitee;
-- member accepts, invitee doesn't; stranger has nothing to do with it.
-- ------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.io',    '{"name": "Owner"}'),
  ('22222222-2222-2222-2222-222222222222', 'member@test.io',   '{"name": "Member"}'),
  ('33333333-3333-3333-3333-333333333333', 'invitee@test.io',  '{"name": "Invitee"}'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@test.io', '{"name": "Stranger"}');

create temp table ctx (task_id bigint);
grant all on ctx to authenticated;

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- broadcasts of `p_event` sent to `p_user`'s topic
create function pg_temp.sent(p_user uuid, p_event text) returns bigint language sql as $$
  select count(*) from realtime.messages where topic = 'user:' || p_user::text and event = p_event;
$$;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
set local role authenticated;
insert into ctx select public.create_shared_task('Plan trip', 'medium', null, array['member@test.io', 'invitee@test.io']);

reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
set local role authenticated;
select public.respond_to_invite((select task_id from ctx), true);

-- ------------------------------------------------------------
-- Chat RLS
-- ------------------------------------------------------------

insert into public.shared_task_comments (task_id, body) values ((select task_id from ctx), 'hello');

select is(
  (select jsonb_array_length(people) from public.my_shared_tasks()),
  3,
  'a member gets the task with its people: owner, member and pending invitee'
);

reset role;
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
set local role authenticated;

select is_empty(
  $$ select id from public.shared_task_comments $$,
  'an invited (not yet accepted) user can''t read the chat'
);

select throws_ok(
  $$ insert into public.shared_task_comments (task_id, body) values ((select task_id from ctx), 'sneaky') $$,
  '42501',
  null,
  'an invited user can''t post'
);

select is_empty($$ select id from public.my_shared_tasks() $$, 'pending invites aren''t in the shared task list');

reset role;
select pg_temp.act_as('44444444-4444-4444-4444-444444444444');
set local role authenticated;

select is_empty($$ select id from public.shared_task_comments $$, 'a stranger can''t read the chat');

-- ------------------------------------------------------------
-- Broadcast routing
-- ------------------------------------------------------------

reset role;

select is(pg_temp.sent('11111111-1111-1111-1111-111111111111', 'comment'), 1::bigint,
  'the owner is sent the new message');
select is(pg_temp.sent('33333333-3333-3333-3333-333333333333', 'comment'), 0::bigint,
  'the invitee is not sent the message');
select is(pg_temp.sent('44444444-4444-4444-4444-444444444444', 'comment'), 0::bigint,
  'the stranger is not sent the message');

-- A second message bumps the owner's one unread chat notification.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
set local role authenticated;
insert into public.shared_task_comments (task_id, body) values ((select task_id from ctx), 'again');
reset role;

select results_eq(
  $$ select count(*), max(comment_count) from public.notifications
     where user_id = '11111111-1111-1111-1111-111111111111' and type = 'task_comment' and read_at is null $$,
  $$ values (1::bigint, 2) $$,
  'two messages make one unread chat notification with a count of 2'
);

-- Removing the member stops their messages at once.
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
set local role authenticated;
delete from public.shared_task_members where user_id = '22222222-2222-2222-2222-222222222222';
insert into public.shared_task_comments (task_id, body) values ((select task_id from ctx), 'after removal');
reset role;

select is(pg_temp.sent('22222222-2222-2222-2222-222222222222', 'comment'), 2::bigint,
  'a removed member is not sent messages posted after their removal');

select ok(
  exists (select 1 from realtime.messages
          where topic = 'user:22222222-2222-2222-2222-222222222222' and event = 'membership'
            and payload ->> 'status' is null),
  'the removed member is told they were removed'
);

-- ------------------------------------------------------------
-- Who may listen to which topic
-- ------------------------------------------------------------

select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
select set_config('realtime.topic', 'user:33333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select isnt_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'users can receive broadcasts on their own topic'
);

reset role;
select set_config('realtime.topic', 'user:11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select is_empty(
  $$ select id from realtime.messages where extension = 'broadcast' $$,
  'users can''t join someone else''s topic'
);

reset role;
select * from finish();
rollback;
