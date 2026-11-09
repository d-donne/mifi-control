/** Bytes per second as a bit rate, the unit carriers and speed tests use. */
export function formatNetRate(bytesPerSec: number | undefined): string {
  if (bytesPerSec === undefined || bytesPerSec < 0) return "—";
  const bits = bytesPerSec * 8;
  if (bits >= 1_000_000) return `${(bits / 1_000_000).toFixed(1)} Mbps`;
  if (bits >= 1_000) return `${Math.round(bits / 1_000)} kbps`;
  return `${Math.round(bits)} bps`;
}

const NETWORK_RANGES = [
  { min: 19, max: 46, label: "3G" },
  { min: 101, max: 101, label: "4G+" },
  { min: 102, max: 102, label: "5G" },
];

export function networkLabel(code?: number): string {
  if (code == null || code === 0) return "—";

  const range = NETWORK_RANGES.find(
    ({ min, max }) => code >= min && code <= max,
  );

  return range?.label ?? `${code}`;
}

// Per the device: ConnectionStatus 901 = connected (LTE/data active).
// Other values: 900 = disconnected, 902 = connecting, etc.
export function isOnline(statusCode?: number): boolean {
  return statusCode === 901;
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

/** Format a byte count with 1024-based units (KB, MB, GB). */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return "—";
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
  return `${bytes} B`;
}

export type DataUnit = "MB" | "GB";

/**
 * Parses the device's `DataLimit` ("20GB", "500MB", "0MB") into its amount
 * and unit. Returns null for anything else.
 */
export function parseDataLimit(
  limit: string,
): { amount: number; unit: DataUnit; bytes: number } | null {
  const match = /^(\d+(?:\.\d+)?)\s*(MB|GB)$/i.exec(limit.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toUpperCase() as DataUnit;
  return { amount, unit, bytes: amount * (unit === "GB" ? GB : MB) };
}

export function describePlan(
  plan:
    | { DataLimit: string; SetMonthData: number; StartDay: number }
    | undefined,
): string | undefined {
  if (!plan) return undefined;
  const limit = parseDataLimit(plan.DataLimit);
  if (plan.SetMonthData !== 1 || !limit || limit.amount === 0) return "Not set";
  return `${limit.amount} ${limit.unit} · resets day ${plan.StartDay}`;
}
