import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly when navigating to the dashboard, while tasks load.
// Having this file also lets Next.js prefetch the route ahead of the click.
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading tasks">
      <Skeleton className="h-10 w-56 sm:h-11" />
      <Skeleton className="mt-3 h-5 w-44" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl sm:mt-8" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 sm:w-80" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
