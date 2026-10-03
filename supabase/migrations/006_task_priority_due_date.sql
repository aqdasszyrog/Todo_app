-- ============================================================
-- 006: task priority + due date, indexes for search/sort/paging,
--      and a summary function for the dashboard counts
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Declared low → high, so `order by priority desc` puts high first.
create type public.task_priority as enum ('low', 'medium', 'high');

alter table public.user_tasks
  add column priority public.task_priority not null default 'medium',
  -- A calendar day, not a moment in time: "due 5 Oct" is the same date in
  -- every timezone, so there's nothing to convert.
  add column due_date date;

-- The dashboard always filters by user, then sorts one of these ways.
-- These replace the plain user_id index from 002.
drop index if exists public.user_tasks_user_id_idx;
create index user_tasks_user_created_idx  on public.user_tasks (user_id, created_at desc);
create index user_tasks_user_due_idx      on public.user_tasks (user_id, due_date);
create index user_tasks_user_priority_idx on public.user_tasks (user_id, priority desc, created_at desc);

-- Counts per progress state across ALL of the user's tasks. The list is
-- paginated, so the page can't count these from the rows it loaded.
-- security invoker (the default) means RLS applies: users only count their own.
create function public.task_summary()
returns json
language sql
stable
set search_path = ''
as $$
  select json_build_object(
    'incomplete',  count(*) filter (where progress = 'incomplete'),
    'in_progress', count(*) filter (where progress = 'in_progress'),
    'completed',   count(*) filter (where progress = 'completed')
  )
  from public.user_tasks
  where user_id = (select auth.uid());
$$;

revoke execute on function public.task_summary() from public, anon;
grant execute on function public.task_summary() to authenticated;
