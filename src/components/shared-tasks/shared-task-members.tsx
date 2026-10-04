"use client";

import { useState, useTransition } from "react";
import { inviteToSharedTask, removeSharedTaskMember } from "@/actions/shared-tasks";
import { Avatar } from "@/components/ui/avatar";
import { XIcon } from "@/components/ui/icons";
import { personLabel, type MemberRole, type SharedTaskPerson } from "@/lib/shared-tasks";
import { EmailInviteField } from "./email-invite-field";
import { useSharedTasks } from "./shared-tasks-provider";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  accepted: "Member",
  invited: "Invited",
};

type Props = {
  taskId: number;
  people: SharedTaskPerson[];
  userId: string;
  isOwner: boolean;
};

// Member list for one shared task. Owners can invite and remove people;
// members only see the list.
export function SharedTaskMembers({ taskId, people, userId, isOwner }: Props) {
  const { dispatch } = useSharedTasks();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(person: SharedTaskPerson) {
    setError(null);
    setRemovingId(person.user_id);
    startTransition(async () => {
      const result = await removeSharedTaskMember(taskId, person.user_id);
      if (result.error) setError(result.error);
      else dispatch({ type: "people", id: taskId, people: people.filter((p) => p.user_id !== person.user_id) });
      setRemovingId(null);
    });
  }

  async function invite(email: string) {
    const result = await inviteToSharedTask(taskId, email);
    if (result.people) dispatch({ type: "people", id: taskId, people: result.people });
    return result.error ?? null;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {people.map((person) => (
          <li
            key={person.user_id}
            className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition ${
              removingId === person.user_id ? "opacity-40" : ""
            }`}
          >
            <Avatar name={personLabel(person)} size="sm" dimmed={person.role === "invited"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {personLabel(person)}
                {person.user_id === userId && <span className="text-muted"> (you)</span>}
              </p>
              {person.name && person.email && (
                <p className="truncate text-xs text-muted">{person.email}</p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                person.role === "owner"
                  ? "bg-violet-500/10 text-violet-300 ring-violet-400/25"
                  : person.role === "invited"
                    ? "text-muted ring-line-strong"
                    : "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25"
              }`}
            >
              {ROLE_LABEL[person.role]}
            </span>
            {isOwner && person.role !== "owner" && (
              <button
                type="button"
                onClick={() => remove(person)}
                disabled={pending}
                aria-label={
                  person.role === "invited"
                    ? `Cancel invite for ${personLabel(person)}`
                    : `Remove ${personLabel(person)}`
                }
                title={person.role === "invited" ? "Cancel invite" : "Remove from task"}
                className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="text-xs text-danger">{error}</p>}

      {isOwner && (
        <EmailInviteField
          id={`invite-${taskId}`}
          label="Invite someone by email"
          buttonLabel="Invite"
          onSubmitEmail={invite}
        />
      )}
    </div>
  );
}
