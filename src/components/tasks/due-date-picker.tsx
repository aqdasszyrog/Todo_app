"use client";

import { useRef } from "react";
import { CalendarIcon, XIcon } from "@/components/ui/icons";
import { useToday } from "@/hooks/use-today";
import { dueStatus, formatDueDate } from "@/lib/dates";
import { DUE_STYLE } from "./task-styles";

type Props = {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Completed tasks aren't "overdue", so their date shows neutrally. */
  muted?: boolean;
};

// A pill showing the due date ("Today", "5 Oct"…), coloured when overdue or
// due today. Clicking it opens the browser's native date picker.
export function DueDatePicker({ id, value, onChange, disabled, muted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const today = useToday();

  const status = value && today && !muted ? dueStatus(value, today) : value ? "upcoming" : "none";
  const label = value ? formatDueDate(value, today) : "Due date";

  return (
    <div
      className={`relative flex items-center rounded-full text-xs font-medium ring-1 ring-inset transition focus-within:ring-2 focus-within:ring-violet-400 ${DUE_STYLE[status]}`}
    >
      <label htmlFor={id} className="flex cursor-pointer items-center gap-1.5 py-1 pr-2.5 pl-2.5">
        <CalendarIcon />
        <span suppressHydrationWarning>
          {status === "overdue" ? `Overdue · ${label}` : label}
        </span>
      </label>
      {/* Invisible input over the pill: keeps native keyboard and mobile pickers. */}
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={() => inputRef.current?.showPicker?.()}
        disabled={disabled}
        aria-label={value ? `Due date: ${label}` : "Set due date"}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Clear due date"
          className="relative z-10 -ml-1 mr-1 grid size-4 place-items-center rounded-full hover:bg-white/10"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}
