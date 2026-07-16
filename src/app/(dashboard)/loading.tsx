import { Skeleton } from "@/components/ui/skeleton";

// Generic page skeleton for all dashboard routes: header row, a stat-card
// band, and a content block. Shapes match the common page rhythm without
// pretending to know each page's exact layout.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}
