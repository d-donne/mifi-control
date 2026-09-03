export function formatRelativeTime(input: Date | number | string) {
  const date = new Date(input);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return;

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
