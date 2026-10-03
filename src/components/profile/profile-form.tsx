"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/actions/profile";
import { NAME_MAX_LENGTH } from "@/lib/profile";
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons";

type Props = { name: string; email: string; phone: string };

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-[#0d0e14] px-4 text-base text-fg placeholder:text-muted transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none";

export function ProfileForm({ name: initialName, email, phone: initialPhone }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = name !== initialName || phone !== initialPhone;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateProfile({ name, phone });
      if (result.error) {
        setError(result.error);
        setSaved(false);
      } else {
        setError(null);
        setSaved(true);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setSaved(false)}
      className="space-y-5 rounded-2xl border border-line bg-surface p-5 backdrop-blur-sm sm:p-8"
    >
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="name"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="profile-email"
          value={email}
          readOnly
          aria-describedby="profile-email-hint"
          className={`${inputClass} cursor-not-allowed text-muted`}
        />
        <p id="profile-email-hint" className="mt-1.5 text-xs text-muted">
          Comes from your Google account and can&apos;t be changed here.
        </p>
      </div>

      <div>
        <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium">
          Phone number <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 900123"
          maxLength={20}
          autoComplete="tel"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || !dirty || !name.trim()}
          className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:bg-right hover:shadow-violet-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
        >
          {pending && <SpinnerIcon />}
          Save changes
        </button>
        {saved && !dirty && (
          <span className="animate-fade-up flex items-center gap-1.5 text-sm text-emerald-300" role="status">
            <CheckIcon /> Saved
          </span>
        )}
      </div>

      {error && <p className="animate-fade-up text-sm text-danger">{error}</p>}
    </form>
  );
}
