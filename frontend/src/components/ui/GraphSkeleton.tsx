"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GraphSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Fake nodes */}
        <div className="relative h-48 w-48">
          <Skeleton className="absolute left-8 top-4 h-6 w-6 rounded-full" />
          <Skeleton className="absolute right-12 top-8 h-8 w-8 rounded-full" />
          <Skeleton className="absolute bottom-8 left-16 h-5 w-5 rounded-full" />
          <Skeleton className="absolute right-4 bottom-16 h-7 w-7 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          {/* Fake edges */}
          <Skeleton className="absolute left-12 top-8 h-[2px] w-20 rotate-12" />
          <Skeleton className="absolute bottom-16 left-20 h-[2px] w-16 -rotate-45" />
          <Skeleton className="absolute right-8 top-16 h-[2px] w-14 rotate-[60deg]" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
