-- Users start on Basic and can't give themselves Premium.
-- Run with `npm run test:db` (needs Docker: it starts a local Supabase).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'user@test.io', '{"name": "User"}');

select is(
  (select plan from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'basic',
  'a new user starts on the Basic plan'
);

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok(
  $$ update public.profiles set name = 'Renamed', phone = '+44 7700 900123' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a user can still edit their name and phone'
);

select throws_ok(
  $$ update public.profiles set plan = 'premium' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a user cannot change their own plan'
);

select throws_ok(
  $$ update public.profiles set stripe_customer_id = 'cus_fake' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a user cannot change their billing details'
);

select * from finish();
rollback;
