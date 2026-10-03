-- ============================================================
-- 010: chat (comments) on shared tasks, with notifications
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
--   owner / accepted member   read, post, delete own messages, get notified
--   owner                     can also delete anyone's message (moderation)
--   invited (not accepted)    nothing: can't read, can't post, never notified
--   removed / left            loses access at once; their chat notifications
--                             for that task are deleted

-- ------------------------------------------------------------
-- Comments
-- ------------------------------------------------------------

create table public.shared_task_comments (
  id         bigint generated always as identity primary key,
  task_id    bigint not null references public.shared_tasks(id) on delete cascade,
  -- Kept (as "Deleted user") if the author's account is removed.
  author_id  uuid default auth.uid() references public.profiles(id) on delete set null,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index shared_task_comments_task_idx on public.shared_task_comments (task_id, id desc);

alter table public.shared_task_comments enable row level security;

-- can_access_shared_task() without p_include_invited = owner or accepted member.
create policy "Owners and members can read comments"
  on public.shared_task_comments for select to authenticated
  using (public.can_access_shared_task(task_id));

create policy "Owners and members can comment as themselves"
  on public.shared_task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_access_shared_task(task_id));

create policy "Authors can delete their comments, owners can delete any"
  on public.shared_task_comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_shared_task_owner(task_id));

-- Messages can't be edited.
revoke update on public.shared_task_comments from anon, authenticated;

-- Comments with author names, newest first, for one task. Profiles are
-- private (RLS), so names come through here, and only for tasks the caller
-- owns or has joined.
create function public.shared_task_comments_page(
  p_task_id bigint,
  p_before_id bigint default null,
  p_limit int default 50
)
returns table (id bigint, author_id uuid, author_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.author_id, coalesce(p.name, p.email), c.body, c.created_at
  from public.shared_task_comments c
  left join public.profiles p on p.id = c.author_id
  where c.task_id = p_task_id
    and public.can_access_shared_task(p_task_id)
    and (p_before_id is null or c.id < p_before_id)
  order by c.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.shared_task_comments_page(bigint, bigint, int) from public, anon;
grant execute on function public.shared_task_comments_page(bigint, bigint, int) to authenticated;

-- ------------------------------------------------------------
-- Notifications for new comments
-- ------------------------------------------------------------

alter type public.notification_type add value if not exists 'task_comment';

alter table public.notifications
  add column preview text,
  -- The comment the preview came from, so deleting it clears the preview.
  add column comment_id bigint,
  -- Unread messages merged into this one notification.
  add column comment_count int not null default 1;

create index notifications_comment_idx on public.notifications (comment_id);

-- Notifies the owner and accepted members (never the author, never invited
-- users). While a user still has an unread chat notification for the task,
-- new messages update it instead of piling up new ones.
create function public.notify_task_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text;
  v_author text;
  v_preview text := left(new.body, 140);
  v_recipient uuid;
begin
  select title into v_title from public.shared_tasks where id = new.task_id;
  select coalesce(name, email) into v_author from public.profiles where id = new.author_id;

  for v_recipient in
    select owner_id from public.shared_tasks where id = new.task_id
    union
    select user_id from public.shared_task_members
    where task_id = new.task_id and status = 'accepted'
  loop
    continue when v_recipient is not distinct from new.author_id;

    update public.notifications
    set actor_id = new.author_id, actor_name = v_author, task_title = v_title,
        preview = v_preview, comment_id = new.id,
        comment_count = comment_count + 1, created_at = now()
    where user_id = v_recipient and shared_task_id = new.task_id
      and type = 'task_comment' and read_at is null;

    if not found then
      insert into public.notifications
        (user_id, type, actor_id, actor_name, task_title, shared_task_id, preview, comment_id)
      values
        (v_recipient, 'task_comment', new.author_id, v_author, v_title, new.task_id, v_preview, new.id);
    end if;
  end loop;

  return null;
end;
$$;

create trigger shared_task_comments_notify
  after insert on public.shared_task_comments
  for each row execute function public.notify_task_comment();

-- A deleted message's text shouldn't live on in anyone's notifications.
create function public.clear_deleted_comment_preview()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.notifications set preview = null, comment_id = null where comment_id = old.id;
  return null;
end;
$$;

create trigger shared_task_comments_clear_preview
  after delete on public.shared_task_comments
  for each row execute function public.clear_deleted_comment_preview();

-- Leaving or being removed ends access to the chat, including the message
-- previews already sitting in that person's notifications.
create function public.cleanup_member_chat_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where user_id = old.user_id and shared_task_id = old.task_id and type = 'task_comment';
  return null;
end;
$$;

create trigger shared_task_members_cleanup_chat
  after delete on public.shared_task_members
  for each row execute function public.cleanup_member_chat_notifications();

-- Trigger functions are not meant to be called directly.
revoke execute on function
  public.notify_task_comment(),
  public.clear_deleted_comment_preview(),
  public.cleanup_member_chat_notifications()
from public, anon, authenticated;

-- ------------------------------------------------------------
-- Realtime: live chat. RLS above decides who receives each message.
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.shared_task_comments;
