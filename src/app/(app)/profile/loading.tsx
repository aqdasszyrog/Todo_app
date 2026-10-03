import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly when navigating to the profile, while it loads.
export default function ProfileLoading() {
  return (
    <div role="status" aria-label="Loading profile">
      <Skeleton className="h-10 w-36 sm:h-11" />
      <Skeleton className="mt-3 h-5 w-72 max-w-full" />
      <div className="mt-6 space-y-5 rounded-2xl border border-line bg-surface p-5 sm:mt-8 sm:p-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-36" />
      </div>
    </div>
  );
}
