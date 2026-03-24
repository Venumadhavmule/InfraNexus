import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SYS_ID_REGEX } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidSysId(id: string): boolean {
  return SYS_ID_REGEX.test(id);
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function operationalStatusLabel(status: number): string {
  switch (status) {
    case 1: return "Operational";
    case 2: return "Non-Operational";
    case 3: return "Repair in Progress";
    case 4: return "Retired";
    default: return "Unknown";
  }
}

export function operationalStatusColor(status: number): string {
  switch (status) {
    case 1: return "text-green-400";
    case 2: return "text-yellow-400";
    case 3: return "text-orange-400";
    case 4: return "text-red-400";
    default: return "text-gray-400";
  }
}
