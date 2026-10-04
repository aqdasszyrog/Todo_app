// Must match supabase/migrations/012_chat_typing.sql
//
// "Is typing…" travels browser to browser over the Realtime WebSocket, on a
// private topic per chat. Nothing is stored and no request is made: the
// typist sends a heartbeat every few seconds while typing, and everyone else
// forgets them if the heartbeats stop (closed tab, lost network), so a
// missed "stop" can't leave someone typing forever.

export function chatTopic(taskId: number) {
  return `chat:${taskId}`;
}

export type TypingEvents = {
  typing: { user_id: string; name: string };
  stop: { user_id: string };
};

/** While typing, announce it at most this often. */
export const TYPING_HEARTBEAT_MS = 3000;
/** Forget a typist who hasn't sent a heartbeat for this long. */
export const TYPING_TIMEOUT_MS = 6000;

/**
 * Decides when the local user's typing should be announced. Keystrokes are
 * throttled to one `typing` per heartbeat, and `stop` is only sent if
 * others were told we were typing.
 */
export class TypingSender {
  private lastSentAt = -Infinity;

  /** Call on every draft change; returns which event (if any) to send. */
  input(draft: string, now: number): "typing" | "stop" | null {
    if (!draft.trim()) return this.stop();
    if (now - this.lastSentAt < TYPING_HEARTBEAT_MS) return null;
    this.lastSentAt = now;
    return "typing";
  }

  /** Call on send, blur or close; returns "stop" if one should be sent. */
  stop(): "stop" | null {
    if (this.lastSentAt === -Infinity) return null;
    this.lastSentAt = -Infinity;
    return "stop";
  }
}

export type Typist = { userId: string; name: string };

/** Who else is typing in a chat, in the order they started. */
export class TypingRoster {
  private typists = new Map<string, { name: string; expiresAt: number }>();

  /** Returns true if the visible list changed. */
  typing(userId: string, name: string, now: number) {
    const existing = this.typists.get(userId);
    this.typists.set(userId, { name, expiresAt: now + TYPING_TIMEOUT_MS });
    return !existing || existing.name !== name;
  }

  /** Returns true if the visible list changed. */
  stop(userId: string) {
    return this.typists.delete(userId);
  }

  /** Drops typists whose heartbeats stopped. Returns true if any were. */
  expire(now: number) {
    let changed = false;
    for (const [userId, t] of this.typists) {
      if (t.expiresAt <= now) changed = this.typists.delete(userId) || changed;
    }
    return changed;
  }

  clear() {
    const changed = this.typists.size > 0;
    this.typists.clear();
    return changed;
  }

  /** When the next typist will expire, or null if nobody is typing. */
  nextExpiry() {
    let next: number | null = null;
    for (const t of this.typists.values()) next = next === null ? t.expiresAt : Math.min(next, t.expiresAt);
    return next;
  }

  list(): Typist[] {
    return [...this.typists].map(([userId, t]) => ({ userId, name: t.name }));
  }
}

export function typingLabel(typists: Typist[]) {
  const names = typists.map((t) => t.name);
  switch (names.length) {
    case 0:
      return "";
    case 1:
      return `${names[0]} is typing…`;
    case 2:
      return `${names[0]} and ${names[1]} are typing…`;
    case 3:
      return `${names[0]}, ${names[1]} and ${names[2]} are typing…`;
    default:
      return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing…`;
  }
}
