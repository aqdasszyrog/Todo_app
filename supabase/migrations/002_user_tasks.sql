-- ============================================================
-- 002: user_tasks table
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table public.user_tasks (
  id         bigint generated always as identity primary key,
  -- Defaults to the logged-in user, so the app never has to send user_id.
  user_id    uuid not null default auth.uid()
             references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 500),
  is_done    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_tasks_user_id_idx on public.user_tasks (user_id);

alter table public.user_tasks enable row level security;

-- Each user can only see and change their own tasks.
create policy "Users can view their own tasks"
  on public.user_tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own tasks"
  on public.user_tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
  on public.user_tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
  on public.user_tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keep updated_at current on every edit.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_tasks_set_updated_at
  before update on public.user_tasks
  for each row execute function public.set_updated_at();
