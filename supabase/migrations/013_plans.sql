-- ============================================================
-- 013: pricing plans (Basic / Premium) backed by Stripe
-- ============================================================

-- Every account is on a plan. `default 'basic'` also fills in every
-- existing row, so all users created before this migration start on Basic.
alter table public.profiles
  add column plan text not null default 'basic' check (plan in ('basic', 'premium')),
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  add column subscription_status text,
  add column plan_renews_at timestamptz,
  add column plan_cancel_at_period_end boolean not null default false;

-- The plan and billing columns are written only by the server, using the
-- secret key, after Stripe confirms a payment (src/lib/billing/*). The
-- "update their own profile" policy from 001 would otherwise let a user set
-- `plan = 'premium'` on their own row, so limit what they may change to the
-- columns the Profile page edits.
revoke update on public.profiles from anon, authenticated;
grant update (name, phone) on public.profiles to authenticated;
