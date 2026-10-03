-- ============================================================
-- 005: optional phone number on profiles
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Nullable: users add it themselves from the Profile page.
-- The existing "update their own profile" policy already covers this column.
alter table public.profiles
  add column phone text
  check (phone is null or char_length(phone) between 7 and 20);
