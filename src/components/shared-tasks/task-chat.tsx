"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { deleteComment, markTaskChatRead, postComment } from "@/actions/comments";
import { Avatar } from "@/components/ui/avatar";
import { SpinnerIcon, TrashIcon } from "@/components/ui/icons";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { useTaskComments } from "@/hooks/use-task-comments";
import { useTyping } from "@/hooks/use-typing";
import { COMMENT_MAX_LENGTH, type TaskComment } from "@/lib/comments";
import { localDateString } from "@/lib/dates";
import { typingLabel, type Typist } from "@/lib/typing";

type Props = {
  taskId: number;
  userId: string;
  /** Owners can delete anyone's message. */
  isOwner: boolean;
  /** Shown on our own messages before the server echoes them back. */
  myName: string;
};

// Messages from the same person this close together share one header.
const GROUP_WINDOW_MS = 5 * 60 * 1000;
// Within this many pixels of the bottom counts as "reading the latest".
const STICK_THRESHOLD_PX = 80;

function dayLabel(iso: string) {
  const day = localDateString(new Date(iso));
  const today = localDateString();
  const yesterday = localDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Avatars shown for a group of typists; the label names the rest.
const MAX_TYPING_AVATARS = 3;

// Three bouncing dots in a bubble, like the other person's messages. Any
// number of typists fits one line: avatars are capped and the label
// truncates, so the list doesn't jump as people start and stop.
function TypingIndicator({ typists }: { typists: Typist[] }) {
  const label = typingLabel(typists);
  return (
    <div aria-hidden className="mt-3 flex animate-fade-in items-end gap-2.5">
      <div className="flex min-w-7 shrink-0 -space-x-2">
        {typists.slice(0, MAX_TYPING_AVATARS).map((t) => (
          <Avatar key={t.userId} name={t.name} size="sm" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col items-start">
        <p className="mb-1 max-w-full truncate px-1 text-xs text-muted">{label}</p>
        <span className="flex h-9 items-center gap-1 rounded-2xl rounded-tl-md bg-surface-2 px-3.5 ring-1 ring-line">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-typing-dot rounded-full bg-muted"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function TaskChat({ taskId, userId, isOwner, myName }: Props) {
  const { comments, loading, error, hasMore, loadingMore, loadEarlier, addLocal, removeLocal } =
    useTaskComments(taskId);
  const { typists, onDraftChange, stopTyping } = useTyping(taskId, userId, myName);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [sending, startSending] = useTransition();
  const [, startDeleting] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const heightBeforeLoadEarlier = useRef<number | null>(null);

  // Keep the newest message in view while the user is at the bottom, and
  // keep their place when older messages are added above.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (heightBeforeLoadEarlier.current !== null) {
      list.scrollTop += list.scrollHeight - heightBeforeLoadEarlier.current;
      heightBeforeLoadEarlier.current = null;
    } else if (stickToBottom.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [comments, typists]);

  // Viewing the chat counts as reading its notifications: on opening, and
  // whenever a message arriving while it's open creates or bumps one.
  useEffect(() => {
    void markTaskChatRead(taskId);
  }, [taskId]);

  useRealtimeEvent("notifications", ({ upserts }) => {
    if (upserts.some((n) => n.type === "task_comment" && n.shared_task_id === taskId && !n.read_at)) {
      void markTaskChatRead(taskId);
    }
  });

  function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSendError(null);
    stickToBottom.current = true;
    stopTyping();
    startSending(async () => {
      const result = await postComment(taskId, body);
      if (result.error || !result.comment) {
        setSendError(result.error ?? "Couldn't send your message.");
        return;
      }
      setDraft("");
      addLocal({ ...result.comment, author_name: myName });
    });
  }

  function remove(comment: TaskComment) {
    setConfirmingId(null);
    removeLocal(comment.id);
    startDeleting(async () => {
      const result = await deleteComment(comment.id);
      if (result.error) {
        setSendError(result.error);
        addLocal(comment);
      }
    });
  }

  function handleLoadEarlier() {
    heightBeforeLoadEarlier.current = listRef.current?.scrollHeight ?? null;
    void loadEarlier();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
        }}
        role="log"
        aria-label="Messages"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        {loading ? (
          <div className="grid h-full place-items-center text-muted">
            <SpinnerIcon className="size-5" />
          </div>
        ) : comments.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="font-medium text-fg">No messages yet</p>
              <p className="mt-1 text-sm text-muted">Start the conversation about this task.</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 text-center">
                <button
                  type="button"
                  onClick={handleLoadEarlier}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted ring-1 ring-line-strong transition ring-inset hover:bg-surface-2 hover:text-fg"
                >
                  {loadingMore && <SpinnerIcon className="size-3" />}
                  Load earlier messages
                </button>
              </div>
            )}

            <ol className="space-y-1">
              {comments.map((comment, i) => {
                const previous = comments[i - 1];
                const mine = comment.author_id === userId;
                const name = comment.author_name ?? "Deleted user";
                const newDay = !previous || dayLabel(previous.created_at) !== dayLabel(comment.created_at);
                const grouped =
                  !newDay &&
                  previous.author_id === comment.author_id &&
                  Date.parse(comment.created_at) - Date.parse(previous.created_at) < GROUP_WINDOW_MS;
                const canDelete = mine || isOwner;

                return (
                  <li key={comment.id}>
                    {newDay && (
                      <p className="my-3 text-center text-[11px] font-medium tracking-wide text-muted uppercase">
                        {dayLabel(comment.created_at)}
                      </p>
                    )}
                    <div className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "" : "mt-3"}`}>
                      <div className="w-7 shrink-0">{!grouped && !mine && <Avatar name={name} size="sm" />}</div>

                      <div className={`flex max-w-[80%] min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}>
                        {!grouped && (
                          <p className="mb-1 px-1 text-xs text-muted">
                            {mine ? "You" : name} · <time dateTime={comment.created_at}>{timeLabel(comment.created_at)}</time>
                          </p>
                        )}
                        <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                          <p
                            className={`rounded-2xl px-3.5 py-2 text-sm leading-6 break-words whitespace-pre-wrap ${
                              mine
                                ? "rounded-tr-md bg-gradient-to-br from-indigo-500/90 via-violet-500/90 to-fuchsia-500/90 text-white"
                                : "rounded-tl-md bg-surface-2 text-fg ring-1 ring-line"
                            }`}
                          >
                            {comment.body}
                          </p>

                          {canDelete &&
                            (confirmingId === comment.id ? (
                              <span className="flex shrink-0 items-center gap-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => remove(comment)}
                                  className="rounded-md px-1.5 py-0.5 text-red-300 hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingId(null)}
                                  className="rounded-md px-1.5 py-0.5 text-muted hover:bg-surface-2"
                                >
                                  Keep
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingId(comment.id)}
                                aria-label="Delete message"
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-300 focus-visible:opacity-100"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {typists.length > 0 && <TypingIndicator typists={typists} />}
        {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
      </div>

      {/* Announced separately: the log above is aria-live for messages. */}
      <p role="status" className="sr-only">
        {typingLabel(typists)}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`chat-${taskId}`} className="sr-only">
            Message
          </label>
          <textarea
            id={`chat-${taskId}`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSendError(null);
              onDraftChange(e.target.value);
            }}
            onBlur={stopTyping}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter adds a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Write a message…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-black/20 px-3.5 py-2 text-sm leading-6 text-fg [field-sizing:content] placeholder:text-muted focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending && <SpinnerIcon className="size-3.5" />}
            Send
          </button>
        </div>
        {sendError && <p className="mt-1.5 text-xs text-danger">{sendError}</p>}
        <p className="mt-1.5 text-[11px] text-muted">Only people on this task can see these messages.</p>
      </form>
    </div>
  );
}
