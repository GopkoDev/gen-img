import type { CostStatus } from "../../shared/generations";

/** micro-USD → `$0.04` / `$0.000125`; an unknown price is shown as its status, never as `$0`. */
export function formatCost(micros: number | null, status: CostStatus): string {
  if (status !== "known" || micros === null) return status;
  const fixed = (micros / 1e6).toFixed(6).replace(/0+$/, "");
  const [whole, frac = ""] = fixed.split(".");
  return `$${whole}.${frac.padEnd(2, "0")}`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return iso.slice(0, 10);
}

export function formatDateTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
