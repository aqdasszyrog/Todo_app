"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { respondToInvite } from "@/actions/notifications";
import { Avatar } from "@/components/ui/avatar";
import { SpinnerIcon } from "@/components/ui/icons";
import { timeAgo } from "@/lib/dates";
import type { AppNotification, MemberStatus } from "@/lib/notifications";

type Props = {
  notification: AppNotification;
  highlighted: boolean;
  /** Called when a link inside is followed, so the panel can close. */
  onNavigate: () => void;
  /** Called once an invite is accepted or declined. */
  onAnswered: (taskId: number, status: MemberStatus) => void;
};

const VERB: Record<AppNotification["type"], string> = {
  task_invite: "invited you to join",
  invite_accepted: "accepted your invite to",
  invite_declined: "declined your invite to",
  task_comment: "sent a message in",
};

function verbFor(n: AppNotification) {
  if (n.type === "task_comment" && n.comment_count > 1) return `sent ${n.comment_count} messages in`;
  return VERB[n.type];
}

export function NotificationItem({ notification: n, highlighted, onNavigate, onAnswered }: Props) {
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actor = n.actor_name ?? "Someone";
  const taskHref = n.shared_task_id ? `/shared?task=${n.shared_task_id}` : "/shared";

  function respond(accept: boolean) {
    setError(null);
    setAnswer(accept ? "accept" : "decline");
    startTransition(async () => {
      const result = await respondToInvite(n.shared_task_id!, accept);
      if (result.error) {
        setError(result.error);
        setAnswer(null);
      } else {
        onAnswered(n.shared_task_id!, accept ? "accepted" : "declined");
      }
    });
  }

  return (
    <li className={`flex gap-3 px-4 py-3 ${highlighted ? "bg-violet-500/[0.07]" : ""}`}>
      <Avatar name={actor} size="sm" />

      <div className="min-w-0 flex-1 text-sm">
        <p className="leading-5 text-fg/90">
          <span className="font-semibold text-fg">{actor}</span> {verbFor(n)}{" "}
          <span className="font-semibold text-fg">&ldquo;{n.task_title ?? "a task"}&rdquo;</span>
        </p>
        {n.type === "task_comment" && n.preview && (
          <p className="mt-1 line-clamp-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs leading-5 break-words text-fg/80">
            {n.preview}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>

        {n.type === "task_invite" && (
          <div className="mt-2">
            {n.invite_status === "invited" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => respond(true)}
                  disabled={pending}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-3 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {pending && answer === "accept" && <SpinnerIcon className="size-3.5" />}
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond(false)}
                  disabled={pending}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted ring-1 ring-line-strong transition ring-inset hover:bg-surface-2 hover:text-fg disabled:opacity-50"
                >
                  {pending && answer === "decline" && <SpinnerIcon className="size-3.5" />}
                  Decline
                </button>
              </div>
            ) : n.invite_status === "accepted" ? (
              <p className="text-xs text-emerald-300">
                You joined this task ·{" "}
                <Link href={taskHref} onClick={onNavigate} className="underline underline-offset-2">
                  Open shared tasks
                </Link>
              </p>
            ) : n.invite_status === "declined" ? (
              <p className="text-xs text-muted">You declined this invite.</p>
            ) : (
              <p className="text-xs text-muted">This invitation is no longer available.</p>
            )}
          </div>
        )}

        {n.type === "task_comment" && n.shared_task_id && (
          <Link
            href={`/shared?task=${n.shared_task_id}&tab=chat`}
            onClick={onNavigate}
            className="mt-1 inline-block text-xs text-violet-300 underline underline-offset-2"
          >
            Open chat
          </Link>
        )}

        {n.type === "invite_accepted" && (
          <Link
            href={taskHref}
            onClick={onNavigate}
            className="mt-1 inline-block text-xs text-violet-300 underline underline-offset-2"
          >
            View task
          </Link>
        )}

        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>

      {highlighted && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-fuchsia-400" />}
    </li>
  );
}
