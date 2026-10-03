-- ============================================================
-- 009: optional description on personal and shared tasks
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table public.user_tasks
  add column description text check (char_length(description) <= 5000);

alter table public.shared_tasks
  add column description text check (char_length(description) <= 5000);

-- Same guard as 007, with description added to the owner-only fields:
-- members may still only change progress.
create or replace function public.shared_tasks_before_update()
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
     and (new.title, new.description, new.priority, new.due_date)
         is distinct from (old.title, old.description, old.priority, old.due_date)
  then
    raise exception 'Only the owner can change the task details' using errcode = '42501';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
