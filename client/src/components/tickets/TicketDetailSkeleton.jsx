import { Card, Skeleton } from "../ui/index.js";

// Same two-column grid as the loaded page, so nothing jumps when the ticket arrives.
export default function TicketDetailSkeleton() {
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        Loading ticket
      </p>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-8 h-5 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </Card>
          <Card>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-1.5 w-full" />
            <Skeleton className="mt-4 h-1.5 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
