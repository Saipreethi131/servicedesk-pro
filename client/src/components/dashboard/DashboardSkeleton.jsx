import { Card, Skeleton } from "../ui/index.js";

// Same grid as the loaded page (four KPI cards, the strip, a chart column and a list column), so nothing jumps when the data
// arrives. The blocks are aria-hidden; one status line tells screen readers the page is loading.
export default function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        Loading dashboard
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 flex items-end justify-between">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-6 w-[72px]" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-[200px] w-full" />
          </Card>
          <Card>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-7 w-full" />
          </Card>
        </div>
        <Card>
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
