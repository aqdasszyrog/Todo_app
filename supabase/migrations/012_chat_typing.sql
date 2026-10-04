-- ============================================================
-- 012: "is typing…" in shared task chats
-- Run in: Supabase Dashboard → SQL Editor → New query
--         (or `npm run db:push` once the CLI is linked; see README)
-- ============================================================
--
-- Typing is ephemeral, so it never touches a table: browsers broadcast it to
-- each other over the Realtime WebSocket on a private topic per chat,
-- `chat:<task id>`, joined only while that chat is open.
--
-- Realtime evaluates these policies once, when a client joins the channel
-- (and again when its token is refreshed), and caches the result. Keystrokes
-- don't cause database queries.
--
-- Events (topic chat:<task id>, client to client):
--   typing   { user_id, name }   sent at most every few seconds while typing
--   stop     { user_id }         draft sent, cleared, or chat closed

-- True when the channel being joined is `chat:<id>` and the user may see
-- that task's chat (owner or accepted member). Parses the topic itself so a
-- malformed topic is simply refused rather than raising a cast error.
create function public.can_join_chat_topic()
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_topic text := (select realtime.topic());
begin
  if v_topic !~ '^chat:[0-9]{1,18}$' then
    return false;
  end if;
  return public.can_access_shared_task(substr(v_topic, 6)::bigint);
end;
$$;

revoke execute on function public.can_join_chat_topic() from public, anon;
grant execute on function public.can_join_chat_topic() to authenticated;

create policy "Chat participants receive typing on the chat topic"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select public.can_join_chat_topic())
  );

create policy "Chat participants send typing on the chat topic"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select public.can_join_chat_topic())
  );

-- user:<id> topics still have no insert policy: clients can only send on
-- chat topics they belong to, never into someone's personal channel.
