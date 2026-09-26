-- ============================================================
-- 004: broadcast user_tasks changes over Supabase Realtime
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Realtime streams changes for tables in the `supabase_realtime` publication.
-- It checks the SELECT policy from 002 for each subscriber, so a user only
-- receives inserts and updates for their own tasks.
--
-- Deletes can't be checked against RLS (the row is gone), so every subscriber
-- receives them, but the payload only contains the primary key (`id`).
alter publication supabase_realtime add table public.user_tasks;
