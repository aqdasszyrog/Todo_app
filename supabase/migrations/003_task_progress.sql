-- ============================================================
-- 003: replace user_tasks.is_done (boolean) with progress (enum)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- An enum is a custom type that only allows these exact values.
create type public.task_progress as enum ('incomplete', 'in_progress', 'completed');

alter table public.user_tasks
  add column progress public.task_progress not null default 'incomplete';

-- Carry over any existing data before dropping the old column.
update public.user_tasks set progress = 'completed' where is_done;

alter table public.user_tasks drop column is_done;
