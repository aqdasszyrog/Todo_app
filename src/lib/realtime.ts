import type { TaskComment } from "./comments";
import type { MemberStatus, NotificationChanges } from "./notifications";
import type { SharedTask, SharedTaskFields, SharedTaskPerson } from "./shared-tasks";

// Must match supabase/migrations/011_scalable_realtime.sql
//
// Every signed-in tab joins one private Broadcast channel, `user:<id>`.
// Database triggers send these events to it, only to the people allowed to
// see them, with everything needed to update the screen without a query.

export function userTopic(userId: string) {
  return `user:${userId}`;
}

export type RealtimeEvents = {
  /** Personal tasks changed (in another tab, or on another device). */
  task: { op: "insert" | "update" | "delete"; ids: number[] };
  notifications: NotificationChanges;
  /** The user's own membership of a shared task changed; null status = removed. */
  membership: { task_id: number; status: MemberStatus | null; task: SharedTask | null };
  /** A shared task was created (with people) or edited (without). */
  shared_task: { task: SharedTaskFields & { people?: SharedTaskPerson[] } };
  shared_task_deleted: { task_id: number };
  shared_task_people: { task_id: number; people: SharedTaskPerson[] };
  comment: { comment: TaskComment & { task_id: number } };
  comment_deleted: { task_id: number; id: number };
  /**
   * Not from the server: the channel reconnected after a drop, so events may
   * have been missed. Listeners reload what they show.
   */
  resync: undefined;
};

export type RealtimeEvent = keyof RealtimeEvents;

type Listener = (payload: unknown) => void;

/** Fans one channel's events out to any number of components. */
export class RealtimeBus {
  private listeners = new Map<string, Set<Listener>>();

  constructor(readonly userId: string) {}

  on(event: string, listener: Listener) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit(event: string, payload: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(payload);
      } catch (err) {
        // One broken listener mustn't stop the others.
        console.error(`Realtime listener for "${event}" failed`, err);
      }
    }
  }
}
