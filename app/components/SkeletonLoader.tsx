export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="mt-2 h-8 w-16 rounded bg-gray-300" />
        </div>
        <div className="h-14 w-14 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 h-6 w-32 rounded bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border-2 border-gray-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-6 w-full rounded bg-gray-300" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
