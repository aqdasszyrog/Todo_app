"use client";

import { useState, useTransition } from "react";
import { createSharedTask, findUserByEmail } from "@/actions/shared-tasks";
import { DueDatePicker } from "@/components/tasks/due-date-picker";
import { PRIORITY_STYLE } from "@/components/tasks/task-styles";
import { Avatar } from "@/components/ui/avatar";
import { PlusIcon, SpinnerIcon, XIcon } from "@/components/ui/icons";
import { PillSelect } from "@/components/ui/pill-select";
import { MAX_INVITES, personLabel, type FoundUser } from "@/lib/shared-tasks";
import {
  DEFAULT_PRIORITY,
  PRIORITY,
  PRIORITY_LABEL,
  TITLE_MAX_LENGTH,
  type Priority,
} from "@/lib/tasks";
import { EmailInviteField } from "./email-invite-field";
import { useSharedTasks } from "./shared-tasks-provider";

const PRIORITY_OPTIONS = PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` }));

export function CreateSharedTaskForm() {
  const { dispatch } = useSharedTasks();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [people, setPeople] = useState<FoundUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Each email is checked as it's added, so only real users become chips.
  async function addPerson(email: string): Promise<string | null> {
    if (people.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      return "Already added.";
    }
    if (people.length >= MAX_INVITES) return `You can invite up to ${MAX_INVITES} people.`;

    const result = await findUserByEmail(email);
    if (result.error || !result.user) return result.error ?? "No user found with that email.";
    const user = result.user;
    setPeople((current) => [...current, user]);
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || people.length === 0) return;

    startTransition(async () => {
      const result = await createSharedTask({
        title,
        priority,
        dueDate,
        emails: people.map((p) => p.email),
      });
      if (result.error) {
        setError(result.error);
      } else {
        if (result.task) dispatch({ type: "upsert", task: result.task });
        setTitle("");
        setPriority(DEFAULT_PRIORITY);
        setDueDate(null);
        setPeople([]);
        setError(null);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-line bg-surface p-4 backdrop-blur-sm sm:p-5"
    >
      <div>
        <label htmlFor="shared-title" className="mb-1.5 block text-sm font-medium">
          New shared task
        </label>
        <input
          id="shared-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing together?"
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-line bg-black/20 px-4 text-base text-fg placeholder:text-muted transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <PillSelect
            id="shared-priority"
            label="Priority"
            value={priority}
            options={PRIORITY_OPTIONS}
            onChange={setPriority}
            disabled={pending}
            pillClassName={PRIORITY_STYLE[priority].pill}
            chevronClassName={PRIORITY_STYLE[priority].text}
          />
          <DueDatePicker id="shared-due" value={dueDate} onChange={setDueDate} disabled={pending} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">
          People <span className="font-normal text-muted">(they&apos;ll get an invite)</span>
        </p>
        <EmailInviteField
          id="shared-invite"
          label="Email of a person to invite"
          buttonLabel="Add"
          onSubmitEmail={addPerson}
          disabled={pending}
        />
        {people.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {people.map((person) => (
              <li
                key={person.id}
                className="animate-fade-up flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-1.5 pl-1 text-sm ring-1 ring-line-strong"
              >
                <Avatar name={personLabel(person)} size="sm" />
                <span className="max-w-48 truncate" title={person.email}>
                  {personLabel(person)}
                </span>
                <button
                  type="button"
                  onClick={() => setPeople((current) => current.filter((p) => p.id !== person.id))}
                  aria-label={`Remove ${personLabel(person)}`}
                  className="grid size-6 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-fg"
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        {error && <p className="mr-auto text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending || !title.trim() || people.length === 0}
          className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:bg-right active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
        >
          {pending ? <SpinnerIcon /> : <PlusIcon className="size-4 stroke-[2.5]" />}
          Create and invite
        </button>
      </div>
    </form>
  );
}
