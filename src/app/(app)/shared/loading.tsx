import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly when navigating to shared tasks, while they load.
export default function SharedTasksLoading() {
  return (
    <div role="status" aria-label="Loading shared tasks">
      <Skeleton className="h-10 w-56 sm:h-11" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <Skeleton className="mt-6 h-56 w-full rounded-2xl sm:mt-8" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
