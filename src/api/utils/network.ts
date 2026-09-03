/** Convert bytes/sec to "X.X Mbps" (or "X KB/s" if below 1 Mbps). */
export function formatNetRate(bytesPerSec: number | undefined): string {
  if (bytesPerSec === undefined || bytesPerSec < 0) return "—";
  const mbps = bytesPerSec / 125_000;
  if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`;
  const kbps = bytesPerSec / 125;
  const bytes = Math.round(bytesPerSec);
  if (kbps >= 1) return `${kbps.toFixed(1)} KB/s`;
  return `${bytes} B/s`;
}

const NETWORK_RANGES = [{ min: 19, max: 46, label: "3G" }];

export function networkLabel(code?: number): string {
  if (code == null || code === 0) return "—";

  if (code === 101) return "4G+";
  if (code === 102) return "5G";

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
