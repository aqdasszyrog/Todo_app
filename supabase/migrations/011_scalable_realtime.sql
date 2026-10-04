-- ============================================================
-- 011: scalable realtime, paginated shared tasks, notification upkeep
-- Run in: Supabase Dashboard → SQL Editor → New query
--         (or `npm run db:push` once the CLI is linked; see README)
-- ============================================================
--
-- Realtime moves from postgres_changes to Broadcast:
--
--   before  every client subscribed to whole tables, Realtime ran an RLS
--           check per change per subscriber, and the client re-fetched the
--           page on each event.
--   after   triggers send ready-to-render payloads to one private topic per
--           user, `user:<uuid>`, and only to the people who should get them.
--           A client joins exactly one channel and applies payloads directly.
--
-- Events (topic user:<uuid>):
--   task                 personal tasks changed           { op, ids }
--   notifications        bell rows changed                { upserts, deletes, unread_count }
--   membership           my membership of a task changed  { task_id, status, task? }
--   shared_task          a shared task was created/edited { task }  (task.people only on create)
--   shared_task_deleted  a shared task was deleted        { task_id }
--   shared_task_people   a task's people changed          { task_id, people }
--   comment              new chat message                 { comment }
--   comment_deleted      chat message deleted             { task_id, id }
--
-- Messages are written to realtime.messages inside the same transaction as
-- the change, so a rolled-back change never sends anything.

-- ------------------------------------------------------------
-- Who may listen: only to your own topic, on a private channel
-- ------------------------------------------------------------

create policy "Users receive broadcasts on their own topic"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text
  );

-- No insert policy: clients can't broadcast; only the triggers below send.

-- ------------------------------------------------------------
-- Helpers (internal: called by triggers and RPCs, not by clients)
-- ------------------------------------------------------------

-- Owner plus accepted members: the people who see the task and its chat.
create function public.shared_task_audience(p_task_id bigint)
returns uuid[]
language sql stable set search_path = ''
as $$
  select coalesce(array_agg(u), '{}')
  from (
    select owner_id as u from public.shared_tasks where id = p_task_id
    union
    select user_id from public.shared_task_members
    where task_id = p_task_id and status = 'accepted'
  ) audience;
$$;

-- Owner first, then accepted members, then pending invites.
create function public.shared_task_people_json(p_task_id bigint)
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('user_id', x.user_id, 'name', x.name, 'email', x.email, 'role', x.role)
      order by x.rank, x.joined_at
    ),
    '[]'::jsonb
  )
  from (
    select p.id as user_id, p.name, p.email, 'owner' as role, 0 as rank, t.created_at as joined_at
    from public.shared_tasks t
    join public.profiles p on p.id = t.owner_id
    where t.id = p_task_id
    union all
    select p.id, p.name, p.email, m.status::text,
           case m.status when 'accepted' then 1 else 2 end, m.created_at
    from public.shared_task_members m
    join public.profiles p on p.id = m.user_id
    where m.task_id = p_task_id and m.status <> 'declined'
  ) x;
$$;

create function public.broadcast_to_users(p_user_ids uuid[], p_event text, p_payload jsonb)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_user uuid;
begin
  foreach v_user in array p_user_ids loop
    continue when v_user is null;
    perform realtime.send(p_payload, p_event, 'user:' || v_user::text, true);
  end loop;
end;
$$;

revoke execute on function
  public.shared_task_audience(bigint),
  public.shared_task_people_json(bigint),
  public.broadcast_to_users(uuid[], text, jsonb)
from public, anon, authenticated;

-- ------------------------------------------------------------
-- Personal tasks: tell the owner's other tabs and devices
-- ------------------------------------------------------------
-- Statement-level, so a bulk change sends one message per user, not per row.
-- Each trigger names its transition table `changed_rows`.

create function public.broadcast_user_task_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in select user_id, jsonb_agg(id) as ids from changed_rows group by user_id loop
    perform realtime.send(
      jsonb_build_object('op', lower(tg_op), 'ids', r.ids),
      'task', 'user:' || r.user_id::text, true
    );
  end loop;
  return null;
end;
$$;

create trigger user_tasks_broadcast_insert
  after insert on public.user_tasks
  referencing new table as changed_rows
  for each statement execute function public.broadcast_user_task_changes();

create trigger user_tasks_broadcast_update
  after update on public.user_tasks
  referencing new table as changed_rows
  for each statement execute function public.broadcast_user_task_changes();

create trigger user_tasks_broadcast_delete
  after delete on public.user_tasks
  referencing old table as changed_rows
  for each statement execute function public.broadcast_user_task_changes();

-- ------------------------------------------------------------
-- Notifications: send the rows themselves, plus the unread count
-- ------------------------------------------------------------
-- user_id, actor_id and comment_id stay server-side. unread_count is the
-- absolute count after the change (not a delta), so a client can't drift
-- out of step even if it applied something optimistically or missed a
-- message.

create function public.broadcast_notification_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select c.user_id,
           coalesce(jsonb_agg(to_jsonb(c) - array['user_id', 'actor_id', 'comment_id'])
                    filter (where tg_op <> 'DELETE'), '[]'::jsonb) as upserts,
           coalesce(jsonb_agg(c.id) filter (where tg_op = 'DELETE'), '[]'::jsonb) as deletes
    from changed_rows c
    group by c.user_id
  loop
    perform realtime.send(
      jsonb_build_object(
        'upserts', r.upserts,
        'deletes', r.deletes,
        'unread_count', (select count(*) from public.notifications n
                         where n.user_id = r.user_id and n.read_at is null)
      ),
      'notifications', 'user:' || r.user_id::text, true
    );
  end loop;
  return null;
end;
$$;

create trigger notifications_broadcast_insert
  after insert on public.notifications
  referencing new table as changed_rows
  for each statement execute function public.broadcast_notification_changes();

create trigger notifications_broadcast_update
  after update on public.notifications
  referencing new table as changed_rows
  for each statement execute function public.broadcast_notification_changes();

create trigger notifications_broadcast_delete
  after delete on public.notifications
  referencing old table as changed_rows
  for each statement execute function public.broadcast_notification_changes();

-- ------------------------------------------------------------
-- Shared tasks
-- ------------------------------------------------------------

create function public.broadcast_shared_task_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Only the owner is on a brand-new task; invites follow as member changes.
    perform public.broadcast_to_users(
      array[new.owner_id], 'shared_task',
      jsonb_build_object('task', to_jsonb(new) || jsonb_build_object('people', public.shared_task_people_json(new.id)))
    );
    return null;
  elsif tg_op = 'UPDATE' then
    perform public.broadcast_to_users(
      public.shared_task_audience(new.id), 'shared_task', jsonb_build_object('task', to_jsonb(new))
    );
    return null;
  else
    -- BEFORE DELETE: the members are still there to be told. The cascade
    -- removes them right after, without sending anything of its own.
    perform public.broadcast_to_users(
      public.shared_task_audience(old.id), 'shared_task_deleted', jsonb_build_object('task_id', old.id)
    );
    return old;
  end if;
end;
$$;

create trigger shared_tasks_broadcast_insert
  after insert on public.shared_tasks
  for each row execute function public.broadcast_shared_task_change();

create trigger shared_tasks_broadcast_update
  after update on public.shared_tasks
  for each row execute function public.broadcast_shared_task_change();

create trigger shared_tasks_broadcast_delete
  before delete on public.shared_tasks
  for each row execute function public.broadcast_shared_task_change();

create function public.broadcast_member_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_task_id bigint := coalesce(new.task_id, old.task_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_status text := case when tg_op = 'DELETE' then null else new.status::text end;
  v_task jsonb;
begin
  -- Part of deleting the whole task: shared_task_deleted already went out,
  -- and invitees' invite notifications are deleted (and broadcast) with it.
  if not exists (select 1 from public.shared_tasks where id = v_task_id) then
    return null;
  end if;

  -- Someone who just joined needs the whole task to show it.
  if v_status = 'accepted' then
    select to_jsonb(t) || jsonb_build_object('people', public.shared_task_people_json(t.id))
    into v_task
    from public.shared_tasks t
    where t.id = v_task_id;
  end if;

  perform public.broadcast_to_users(
    array[v_user], 'membership',
    jsonb_build_object('task_id', v_task_id, 'status', v_status, 'task', v_task)
  );

  perform public.broadcast_to_users(
    array(select unnest(public.shared_task_audience(v_task_id)) except select v_user),
    'shared_task_people',
    jsonb_build_object('task_id', v_task_id, 'people', public.shared_task_people_json(v_task_id))
  );

  return null;
end;
$$;

create trigger shared_task_members_broadcast
  after insert or update or delete on public.shared_task_members
  for each row execute function public.broadcast_member_change();

-- ------------------------------------------------------------
-- Chat
-- ------------------------------------------------------------

create function public.broadcast_comment_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.broadcast_to_users(
      public.shared_task_audience(new.task_id), 'comment',
      jsonb_build_object('comment', jsonb_build_object(
        'id', new.id,
        'task_id', new.task_id,
        'author_id', new.author_id,
        'author_name', (select coalesce(name, email) from public.profiles where id = new.author_id),
        'body', new.body,
        'created_at', new.created_at
      ))
    );
  elsif exists (select 1 from public.shared_tasks where id = old.task_id) then
    -- (Skipped when the whole task is being deleted.)
    perform public.broadcast_to_users(
      public.shared_task_audience(old.task_id), 'comment_deleted',
      jsonb_build_object('task_id', old.task_id, 'id', old.id)
    );
  end if;
  return null;
end;
$$;

create trigger shared_task_comments_broadcast
  after insert or delete on public.shared_task_comments
  for each row execute function public.broadcast_comment_change();

-- Same as 010, but skipped when the whole task is being deleted: its
-- notifications are deleted by the cascade anyway.
create or replace function public.clear_deleted_comment_preview()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.shared_tasks where id = old.task_id) then
    update public.notifications set preview = null, comment_id = null where comment_id = old.id;
  end if;
  return null;
end;
$$;

revoke execute on function
  public.broadcast_user_task_changes(),
  public.broadcast_notification_changes(),
  public.broadcast_shared_task_change(),
  public.broadcast_member_change(),
  public.broadcast_comment_change()
from public, anon, authenticated;

-- ------------------------------------------------------------
-- Chat notifications: one atomic upsert per message
-- ------------------------------------------------------------
-- 010 updated, then inserted if nothing matched. Two messages at the same
-- moment could both insert, leaving two unread notifications for one chat.
-- A unique index makes "at most one unread chat notification per task" a
-- rule, and ON CONFLICT handles the race.

-- Keep the newest of any duplicates the race already created.
update public.notifications
set read_at = now()
where id in (
  select id
  from (
    select id, row_number() over (partition by user_id, shared_task_id order by created_at desc, id desc) as rn
    from public.notifications
    where type = 'task_comment' and read_at is null
  ) ranked
  where rn > 1
);

create unique index notifications_one_unread_chat_idx
  on public.notifications (user_id, shared_task_id)
  where type = 'task_comment' and read_at is null;

create or replace function public.notify_task_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text;
  v_author text;
begin
  select title into v_title from public.shared_tasks where id = new.task_id;
  select coalesce(name, email) into v_author from public.profiles where id = new.author_id;

  insert into public.notifications
    (user_id, type, actor_id, actor_name, task_title, shared_task_id, preview, comment_id)
  select r.user_id, 'task_comment'::public.notification_type, new.author_id, v_author, v_title, new.task_id, left(new.body, 140), new.id
  from unnest(public.shared_task_audience(new.task_id)) as r(user_id)
  where r.user_id is distinct from new.author_id
  on conflict (user_id, shared_task_id) where type = 'task_comment' and read_at is null
  do update set
    actor_id = excluded.actor_id,
    actor_name = excluded.actor_name,
    task_title = excluded.task_title,
    preview = excluded.preview,
    comment_id = excluded.comment_id,
    comment_count = public.notifications.comment_count + 1,
    created_at = now();

  return null;
end;
$$;

-- ------------------------------------------------------------
-- Invites: cap members per task, and serialise concurrent invites
-- ------------------------------------------------------------
-- Every chat message is sent to every member, so the member count bounds
-- the work per message. Must match MAX_MEMBERS in src/lib/shared-tasks.ts.

-- Returns 'invited', 'not_found', 'self', 'already_member', 'already_invited' or 'full'.
create or replace function public.invite_to_shared_task(p_task_id bigint, p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_title text;
  v_invitee uuid;
  v_status public.member_status;
  v_actor_name text;
begin
  -- FOR UPDATE: two invites to the same task run one after the other, so
  -- they can't both pass the member cap check.
  select title into v_title
  from public.shared_tasks
  where id = p_task_id and owner_id = v_uid
  for update;

  if not found then
    raise exception 'Only the task owner can invite people' using errcode = '42501';
  end if;

  select id into v_invitee
  from public.profiles
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_invitee is null then return 'not_found'; end if;
  if v_invitee = v_uid then return 'self'; end if;

  select status into v_status
  from public.shared_task_members
  where task_id = p_task_id and user_id = v_invitee;

  if v_status = 'accepted' then return 'already_member'; end if;
  if v_status = 'invited' then return 'already_invited'; end if;

  if (select count(*) from public.shared_task_members
      where task_id = p_task_id and status <> 'declined') >= 50 then
    return 'full';
  end if;

  -- A previously declined user can be invited again.
  insert into public.shared_task_members (task_id, user_id, status, invited_by)
  values (p_task_id, v_invitee, 'invited', v_uid)
  on conflict (task_id, user_id) do update
    set status = 'invited', invited_by = excluded.invited_by,
        created_at = now(), responded_at = null;

  select coalesce(name, email) into v_actor_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, actor_id, actor_name, task_title, shared_task_id)
  values (v_invitee, 'task_invite', v_uid, v_actor_name, v_title, p_task_id);

  return 'invited';
end;
$$;

-- create_shared_task() treats 'full' like the other failures.
create or replace function public.create_shared_task(
  p_title text,
  p_priority public.task_priority,
  p_due_date date,
  p_emails text[]
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_task_id bigint;
  v_email text;
  v_result text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  insert into public.shared_tasks (owner_id, title, priority, due_date)
  values (v_uid, trim(p_title), coalesce(p_priority, 'medium'), p_due_date)
  returning id into v_task_id;

  foreach v_email in array coalesce(p_emails, '{}') loop
    v_result := public.invite_to_shared_task(v_task_id, v_email);
    if v_result in ('not_found', 'self', 'full') then
      raise exception 'Cannot invite %: %', v_email, v_result using errcode = 'P0002';
    end if;
  end loop;

  return v_task_id;
end;
$$;

-- ------------------------------------------------------------
-- Shared task list: one paginated call with people included
-- ------------------------------------------------------------
-- Replaces the membership query + OR(id.in.(...)) + shared_task_people()
-- round trips. Newest first, keyset-paginated by id (ids only grow).

create function public.my_shared_tasks(
  p_before_id bigint default null,
  p_limit int default 20,
  p_task_id bigint default null
)
returns table (
  id bigint,
  owner_id uuid,
  title text,
  description text,
  progress public.task_progress,
  priority public.task_priority,
  due_date date,
  created_at timestamptz,
  updated_at timestamptz,
  people jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if v_uid is null then
    return;
  end if;

  return query
  with mine as (
    (select t.id from public.shared_tasks t
     where t.owner_id = v_uid
       and (p_before_id is null or t.id < p_before_id)
       and (p_task_id is null or t.id = p_task_id)
     order by t.id desc
     limit v_limit)
    union
    (select m.task_id from public.shared_task_members m
     where m.user_id = v_uid and m.status = 'accepted'
       and (p_before_id is null or m.task_id < p_before_id)
       and (p_task_id is null or m.task_id = p_task_id)
     order by m.task_id desc
     limit v_limit)
  )
  select t.id, t.owner_id, t.title, t.description, t.progress, t.priority, t.due_date,
         t.created_at, t.updated_at, public.shared_task_people_json(t.id)
  from mine
  join public.shared_tasks t on t.id = mine.id
  order by t.id desc
  limit v_limit;
end;
$$;

revoke execute on function public.my_shared_tasks(bigint, int, bigint) from public, anon;
grant execute on function public.my_shared_tasks(bigint, int, bigint) to authenticated;

-- Replaced by my_shared_tasks() and the shared_task_people broadcast.
drop function public.shared_task_people(bigint[]);

-- ------------------------------------------------------------
-- Indexes for the paths above
-- ------------------------------------------------------------

-- Keyset pages of "tasks I own" / "tasks I joined", newest first.
drop index if exists public.shared_tasks_owner_idx;
create index shared_tasks_owner_id_idx on public.shared_tasks (owner_id, id desc);

drop index if exists public.shared_task_members_user_idx;
create index shared_task_members_user_status_idx
  on public.shared_task_members (user_id, status, task_id desc);

-- Unread badge count and "mark all read".
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- Deleting a shared task cascades to its notifications; without this the
-- foreign key check scans the whole table.
create index notifications_shared_task_idx on public.notifications (shared_task_id);

-- Nightly clean-up below.
create index notifications_created_idx on public.notifications (created_at);

-- ------------------------------------------------------------
-- Stop the old postgres_changes feed
-- ------------------------------------------------------------
-- Nothing subscribes to it any more; leaving tables in the publication
-- would still make Realtime decode every change to them.

do $$
declare
  v_table text;
begin
  foreach v_table in array array['user_tasks', 'shared_tasks', 'shared_task_members', 'notifications', 'shared_task_comments'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Notification retention
-- ------------------------------------------------------------
-- Read notifications go after 30 days, anything after 90. The bell only
-- ever shows the latest 20, so these are never seen again.

create extension if not exists pg_cron;

select cron.schedule(
  'prune-notifications',
  '17 3 * * *',
  $$
    delete from public.notifications
    where (read_at is not null and read_at < now() - interval '30 days')
       or created_at < now() - interval '90 days'
  $$
);
