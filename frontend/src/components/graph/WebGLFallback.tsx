"use client";

export function WebGLFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-8">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-4 text-4xl">🖥️</div>
        <h2 className="mb-2 text-lg font-semibold">WebGL Not Available</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your browser or device does not support WebGL, which is required for
          the 3D graph visualization. Please try:
        </p>
        <ul className="mb-4 space-y-1 text-left text-sm text-muted-foreground">
          <li>• Using a modern browser (Chrome, Firefox, Edge)</li>
          <li>• Enabling hardware acceleration in browser settings</li>
          <li>• Updating your graphics drivers</li>
        </ul>
      </div>
    </div>
  );
}

export function detectWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return gl != null;
  } catch {
    return false;
  }
}
