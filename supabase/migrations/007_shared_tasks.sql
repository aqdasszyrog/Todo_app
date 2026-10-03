-- ============================================================
-- 007: shared tasks, members, invitations and notifications
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- Who can do what:
--   owner            sees and edits everything, invites/removes members, deletes
--   accepted member  sees the task and its members, changes progress, can leave
--   invited user     sees the task title (for the invite), accepts or declines
--   everyone else    nothing
--
-- Creating, inviting and responding go through the functions at the bottom,
-- so each is a single transaction and users never insert other people's
-- membership rows or notifications directly.

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create type public.member_status as enum ('invited', 'accepted', 'declined');

create table public.shared_tasks (
  id         bigint generated always as identity primary key,
  owner_id   uuid not null default auth.uid()
             references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 500),
  progress   public.task_progress not null default 'incomplete',
  priority   public.task_priority not null default 'medium',
  due_date   date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_tasks_owner_idx on public.shared_tasks (owner_id);

-- The owner is not a row here; owner_id on the task covers them.
create table public.shared_task_members (
  task_id      bigint not null references public.shared_tasks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       public.member_status not null default 'invited',
  invited_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (task_id, user_id)
);

create index shared_task_members_user_idx on public.shared_task_members (user_id, status);

create type public.notification_type as enum ('task_invite', 'invite_accepted', 'invite_declined');

create table public.notifications (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           public.notification_type not null,
  actor_id       uuid references public.profiles(id) on delete set null,
  -- Snapshots taken when the notification is created, so showing it never
  -- needs to read another user's profile.
  actor_name     text,
  task_title     text,
  shared_task_id bigint references public.shared_tasks(id) on delete cascade,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- Invites look users up by email, case-insensitively.
create index profiles_email_lower_idx on public.profiles (lower(email));

-- ------------------------------------------------------------
-- Access helpers
-- ------------------------------------------------------------
-- security definer: they read the tables without RLS. Policies on
-- shared_tasks and shared_task_members check each other, which would
-- otherwise recurse forever.

create function public.is_shared_task_owner(p_task_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.shared_tasks
    where id = p_task_id and owner_id = (select auth.uid())
  );
$$;

-- Owner or accepted member; invited users too when p_include_invited.
create function public.can_access_shared_task(p_task_id bigint, p_include_invited boolean default false)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_shared_task_owner(p_task_id)
      or exists (
        select 1 from public.shared_task_members
        where task_id = p_task_id
          and user_id = (select auth.uid())
          and (status = 'accepted' or (p_include_invited and status = 'invited'))
      );
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.shared_tasks enable row level security;
alter table public.shared_task_members enable row level security;
alter table public.notifications enable row level security;

-- shared_tasks: no insert policy; tasks are created by create_shared_task().
create policy "Owners, members and invitees can view shared tasks"
  on public.shared_tasks for select to authenticated
  using (public.can_access_shared_task(id, true));

create policy "Owners and members can update shared tasks"
  on public.shared_tasks for update to authenticated
  using (public.can_access_shared_task(id))
  with check (public.can_access_shared_task(id));

create policy "Owners can delete shared tasks"
  on public.shared_tasks for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- shared_task_members: no insert/update policies; rows are written by
-- invite_to_shared_task() and respond_to_invite().
create policy "Users see their own membership, members see the whole list"
  on public.shared_task_members for select to authenticated
  using ((select auth.uid()) = user_id or public.can_access_shared_task(task_id));

create policy "Members can leave, owners can remove members"
  on public.shared_task_members for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_shared_task_owner(task_id));

-- notifications: users only read and dismiss their own.
create policy "Users can view their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Marking as read is the only change users may make to a notification.
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ------------------------------------------------------------
-- Update guard: members may only change progress
-- ------------------------------------------------------------

create function public.shared_tasks_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
    raise exception 'owner_id and created_at cannot be changed' using errcode = '42501';
  end if;

  -- auth.uid() is null for admin/SQL editor sessions, which may edit freely.
  if (select auth.uid()) is not null
     and (select auth.uid()) is distinct from old.owner_id
     and (new.title, new.priority, new.due_date) is distinct from (old.title, old.priority, old.due_date)
  then
    raise exception 'Only the owner can change the title, priority or due date' using errcode = '42501';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger shared_tasks_before_update
  before update on public.shared_tasks
  for each row execute function public.shared_tasks_before_update();

-- ------------------------------------------------------------
-- Functions called by the app
-- ------------------------------------------------------------

-- Exact, case-insensitive email match. Returns only id, name and email,
-- never the rest of the profile.
create function public.find_user_by_email(p_email text)
returns table (id uuid, name text, email text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.email
  from public.profiles p
  where (select auth.uid()) is not null
    and lower(p.email) = lower(trim(p_email))
  limit 1;
$$;

-- Returns 'invited', 'not_found', 'self', 'already_member' or 'already_invited'.
create function public.invite_to_shared_task(p_task_id bigint, p_email text)
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
  select title into v_title
  from public.shared_tasks
  where id = p_task_id and owner_id = v_uid;

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

-- Creates the task and invites everyone in one transaction: if any email
-- doesn't belong to a user, nothing is created.
create function public.create_shared_task(
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
    if v_result in ('not_found', 'self') then
      raise exception 'Cannot invite %: %', v_email, v_result using errcode = 'P0002';
    end if;
  end loop;

  return v_task_id;
end;
$$;

-- Accepts or declines the caller's pending invite and tells the owner.
create function public.respond_to_invite(p_task_id bigint, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_title text;
  v_actor_name text;
begin
  update public.shared_task_members
  set status = case when p_accept then 'accepted'::public.member_status else 'declined' end,
      responded_at = now()
  where task_id = p_task_id and user_id = v_uid and status = 'invited';

  if not found then
    raise exception 'This invitation is no longer available' using errcode = 'P0002';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = v_uid and shared_task_id = p_task_id and type = 'task_invite';

  select owner_id, title into v_owner, v_title from public.shared_tasks where id = p_task_id;
  select coalesce(name, email) into v_actor_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, actor_id, actor_name, task_title, shared_task_id)
  values (
    v_owner,
    case when p_accept then 'invite_accepted'::public.notification_type else 'invite_declined' end,
    v_uid, v_actor_name, v_title, p_task_id
  );
end;
$$;

-- Owner and members of the given tasks, with names and emails. Only returns
-- people on tasks the caller owns or has joined.
create function public.shared_task_people(p_task_ids bigint[])
returns table (task_id bigint, user_id uuid, name text, email text, role text)
language sql stable security definer set search_path = ''
as $$
  select t.id, p.id, p.name, p.email, 'owner'
  from public.shared_tasks t
  join public.profiles p on p.id = t.owner_id
  where t.id = any (p_task_ids) and public.can_access_shared_task(t.id)
  union all
  select m.task_id, p.id, p.name, p.email, m.status::text
  from public.shared_task_members m
  join public.profiles p on p.id = m.user_id
  where m.task_id = any (p_task_ids)
    and m.status <> 'declined'
    and public.can_access_shared_task(m.task_id);
$$;

-- Only signed-in users may call any of these.
revoke execute on function
  public.is_shared_task_owner(bigint),
  public.can_access_shared_task(bigint, boolean),
  public.find_user_by_email(text),
  public.invite_to_shared_task(bigint, text),
  public.create_shared_task(text, public.task_priority, date, text[]),
  public.respond_to_invite(bigint, boolean),
  public.shared_task_people(bigint[])
from public, anon;

grant execute on function
  public.is_shared_task_owner(bigint),
  public.can_access_shared_task(bigint, boolean),
  public.find_user_by_email(text),
  public.invite_to_shared_task(bigint, text),
  public.create_shared_task(text, public.task_priority, date, text[]),
  public.respond_to_invite(bigint, boolean),
  public.shared_task_people(bigint[])
to authenticated;

-- ------------------------------------------------------------
-- Realtime: live bell count and live shared-task updates
-- ------------------------------------------------------------
-- Realtime applies the SELECT policies above to every subscriber.
alter publication supabase_realtime add table
  public.shared_tasks, public.shared_task_members, public.notifications;
