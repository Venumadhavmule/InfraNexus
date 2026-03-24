"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { GraphSkeleton } from "@/components/ui/GraphSkeleton";

const GraphCanvas = dynamic(() => import("./GraphCanvas").then((m) => m.GraphCanvas), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

export function CMDBGraph() {
  return (
    <ErrorFallback
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-background">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold text-destructive">
              WebGL Error
            </h2>
            <p className="text-sm text-muted-foreground">
              The 3D graph renderer encountered an error. Please try refreshing the page.
            </p>
          </div>
        </div>
      }
    >
      <Suspense fallback={<GraphSkeleton />}>
        <GraphCanvas />
      </Suspense>
    </ErrorFallback>
  );
}
