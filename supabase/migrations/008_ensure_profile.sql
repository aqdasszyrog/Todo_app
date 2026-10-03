-- ============================================================
-- 008: recreate a signed-in user's missing profile row
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Every account needs a profile (tasks reference it). The trigger in 001
-- only creates one at sign-up, so if a profile row is deleted while the
-- account still exists, the app calls this to rebuild it from the same
-- Google details. It only ever touches the caller's own row.
create function public.ensure_profile()
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.profiles (id, name, email)
  select
    u.id,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.email
  from auth.users u
  where u.id = (select auth.uid())
  on conflict (id) do nothing;
$$;

revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;
