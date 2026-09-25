-- ============================================================
-- 001: profiles table + auto-create trigger
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- One row per user. `id` is the same uuid as auth.users.id.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);

-- Row Level Security: nobody can read/write rows unless a policy allows it.
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- When Supabase Auth inserts a new user (first Google login),
-- copy their name and email into public.profiles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
