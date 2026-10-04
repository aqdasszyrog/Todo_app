"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Shown in place of a signed-in page when rendering it throws. The header
// and sidebar (from the layout) stay, so the user can still navigate away.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="animate-fade-up rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-10 text-center">
      <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">
        This page couldn&apos;t load. It&apos;s probably temporary.
        {error.digest && <span className="mt-1 block text-xs">Reference: {error.digest}</span>}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 h-9 rounded-xl px-4 text-sm font-medium text-fg ring-1 ring-line-strong transition ring-inset hover:bg-surface-2"
      >
        Try again
      </button>
    </div>
  );
}
