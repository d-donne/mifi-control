export function formatRelativeTime(input: Date | number | string) {
  const date = new Date(input);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return undefined;

  const diff = timestamp - Date.now();
  const seconds = Math.round(diff / 1000);
  const abs = Math.abs(seconds);

  if (abs < 2) {
    return "just now";
  }

  if (abs < 60) {
    return `${abs} seconds ago`;
  }

  const minutes = Math.round(abs / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.round(hours / 24);

  if (days <= 7) {
    if (days === 1) return "yesterday";

    return `${days} days ago`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";

  return "Good night";
}

/**
 * Full datetime for SMS display. Device dates arrive as
 * "YYYY-MM-DD HH:MM:SS" (naive device-local). Rendered as
 * "13 Sep 2026, 14:32" so timestamps are unambiguous in-thread.
 */
export function formatFullDateTime(input: string): string {
  // "YYYY-MM-DD HH:MM:SS" → ISO local form; parsed as local time.
  const date = new Date(input.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Seconds → "2d 4h", "6h 12m", "8m", "45s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${s}s`;
}

/** Device dates are naive device-local "YYYY-MM-DD HH:MM:SS". */
export function parseDeviceDate(input: string): Date | null {
  const date = new Date(input.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBefore(date: Date, now: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - day.getTime()) / 86_400_000);
}

/** "14:32" */
export function formatClockTime(input: string): string {
  const date = parseDeviceDate(input);
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Inbox timestamp: "14:32", "Yesterday", "Mon", "12 Sep", "12 Sep 2025". */
export function formatListTime(input: string, now = new Date()): string {
  const date = parseDeviceDate(input);
  if (!date) return "";
  const days = daysBefore(date, now);
  if (days <= 0) return formatClockTime(input);
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

/** Day separator: "Today", "Yesterday", "Monday", "12 September 2025". */
export function formatDayLabel(input: string, now = new Date()): string {
  const date = parseDeviceDate(input);
  if (!date) return "";
  const days = daysBefore(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}
