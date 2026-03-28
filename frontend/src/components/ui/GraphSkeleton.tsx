"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GraphSkeleton() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-6 rounded-[28px] border border-border/60 bg-background/88 px-10 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="relative h-56 w-56">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_60%)]" />
          <Skeleton className="absolute left-7 top-10 h-6 w-6 rounded-full bg-sky-300/70" />
          <Skeleton className="absolute right-9 top-12 h-9 w-9 rounded-2xl bg-cyan-300/70" />
          <Skeleton className="absolute left-14 bottom-10 h-5 w-5 rounded-full bg-blue-300/70" />
          <Skeleton className="absolute right-6 bottom-16 h-7 w-7 rounded-xl bg-sky-300/70" />
          <Skeleton className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-cyan-400/80" />
          <Skeleton className="absolute left-12 top-14 h-0.5 w-24 rotate-12 bg-slate-300/80" />
          <Skeleton className="absolute bottom-16 left-20 h-0.5 w-20 -rotate-45 bg-slate-300/80" />
          <Skeleton className="absolute right-10 top-20 h-0.5 w-16 rotate-60 bg-slate-300/80" />
          <Skeleton className="absolute left-[6.2rem] top-[6.9rem] h-0.5 w-14 -rotate-18 bg-slate-300/70" />
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="space-y-2">
            <Skeleton className="mx-auto h-5 w-52" />
            <Skeleton className="mx-auto h-4 w-36" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Building a bounded CMDB neighborhood and warming up the graph layout.
          </p>
        </div>
      </div>
    </div>
  );
}
