"use client";

import { useState, useTransition } from "react";
import { SpinnerIcon } from "@/components/ui/icons";
import { EMAIL_MAX_LENGTH } from "@/lib/validation";

type Props = {
  id: string;
  label: string;
  buttonLabel: string;
  /** Handles the email; resolves to an error message, or null on success (clears the field). */
  onSubmitEmail: (email: string) => Promise<string | null>;
  disabled?: boolean;
};

// Email input with an action button. Not a <form>: it's used inside other
// forms, so Enter is handled here instead of submitting the outer form.
export function EmailInviteField({ id, label, buttonLabel, onSubmitEmail, disabled }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!email.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await onSubmitEmail(email.trim());
      if (result) setError(result);
      else setEmail("");
    });
  }

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="name@example.com"
          maxLength={EMAIL_MAX_LENGTH}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-black/20 px-3 text-sm text-fg placeholder:text-muted transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none aria-invalid:border-red-400/50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || pending || !email.trim()}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium text-fg ring-1 ring-line-strong transition ring-inset hover:bg-surface-2 disabled:opacity-40"
        >
          {pending && <SpinnerIcon className="size-3.5" />}
          {buttonLabel}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="animate-fade-up mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
