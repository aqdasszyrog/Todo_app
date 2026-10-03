// Placeholder block shown while a page's data is loading.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}
