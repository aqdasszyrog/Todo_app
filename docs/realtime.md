# How Live Updates Work

When something changes (a shared task is edited, a chat message is sent, an invite is answered), everyone who should see it sees it within a moment, without reloading. This document explains how, and why it's built this way.

---

## 1. The short version

```
 a write (Server Action or RPC)
        │
        ▼
 Postgres trigger ──► realtime.send(payload, event, 'user:<id>')   one message per person who should see it
                                │
                                ▼
                 Supabase Realtime (Broadcast)
                                │   private channel, checked against realtime.messages RLS
                                ▼
 each signed-in tab: RealtimeProvider ──► useRealtimeEvent('comment', …) ──► state update
```

- Every signed-in tab joins **one** private channel: `user:<their id>` ([realtime-provider.tsx](../src/components/realtime/realtime-provider.tsx)).
- **Database triggers decide who hears about a change** and send it to each of those people's topics ([011_scalable_realtime.sql](../supabase/migrations/011_scalable_realtime.sql)).
- Payloads carry **what the screen needs** (the message with its author's name, the task's new fields, the new people list), so clients update their state directly and run no query.

## 2. Events

| Event | Sent to | Payload | Used by |
|---|---|---|---|
| `task` | the owner | `{ op, ids }` | [realtime-tasks.tsx](../src/components/tasks/realtime-tasks.tsx): refreshes the personal list |
| `notifications` | the recipient | `{ upserts, deletes, unread_count }` | [use-notifications.ts](../src/hooks/use-notifications.ts): the bell |
| `membership` | the member | `{ task_id, status, task? }` | the bell (invite status) and the `/shared` list (joined / removed) |
| `shared_task` | owner + accepted members | `{ task }` | [shared-tasks-provider.tsx](../src/components/shared-tasks/shared-tasks-provider.tsx) |
| `shared_task_deleted` | owner + accepted members | `{ task_id }` | same |
| `shared_task_people` | owner + accepted members | `{ task_id, people }` | same |
| `comment` | owner + accepted members | `{ comment }` (with `author_name`) | [use-task-comments.ts](../src/hooks/use-task-comments.ts) |
| `comment_deleted` | owner + accepted members | `{ task_id, id }` | same |
| `resync` | (client-side only) | | fired after a reconnect; listeners reload what they show |

Event names and payload types are defined once in [src/lib/realtime.ts](../src/lib/realtime.ts) and must match the migration.

## 3. Why Broadcast and not `postgres_changes`

The app used to subscribe to whole tables with `postgres_changes`. That has three costs that grow with users:

1. **Realtime checks RLS for every change against every subscriber.** Supabase documents this as the part that doesn't scale.
2. **Delete events can't be filtered**, so every client received every delete on the table.
3. **Payloads lacked context** (no author name), so each client re-fetched data on every event, often by re-rendering the whole page.

With Broadcast, the trigger works out the recipients **once, at write time**, and each client receives only its own messages. Authorization is a single, cheap check when the channel is joined: the `realtime.messages` policy allows only your own topic.

**Fan-out is bounded.** A chat message is sent once per person on the task, and a task can have at most 50 people (`MAX_MEMBERS`, enforced in `invite_to_shared_task()`).

## 4. Consistency rules

- **Messages are transactional.** `realtime.send` writes inside the same transaction as the change. If the change rolls back, nothing is sent.
- **Actions update the acting tab directly.** Server Actions return the changed row, which is applied immediately, so the UI doesn't wait for the broadcast. The broadcast that follows is idempotent: lists merge by id, and a task update with an older `updated_at` is ignored.
- **The unread count is absolute**, not a delta, so an optimistic "mark all read" or a missed message can't make it drift.
- **Reconnects resync.** If the connection drops (sleep, network), `resync` makes each listener reload its data.
- **Removed members stop receiving immediately**, because recipients are worked out per message, not per connection.

## 5. Adding a new live feature (e.g. a chatbot)

1. In a migration, add a trigger (or call `realtime.send` from an RPC) that sends `'your_event'` to `'user:' || <recipient id>`.
2. Add the payload type to `RealtimeEvents` in `src/lib/realtime.ts`.
3. In a component: `useRealtimeEvent("your_event", (payload) => …)`.

There's no need for a new channel, subscription or RLS policy.
