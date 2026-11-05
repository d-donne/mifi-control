import PulsingDot from "@/components/common/PulsingDot";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatRelativeTime, getGreeting } from "@/src/api/utils/date";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import { useEffect, useState } from "react";

// Status polls every 8 s; missing three in a row reads as stale.
const STALE_MS = 30_000;

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Freshness({ now }: { now: number }) {
  const { dataUpdatedAt } = useStatus();
  const live = dataUpdatedAt > 0 && now - dataUpdatedAt < STALE_MS;

  const [dot, label] =
    dataUpdatedAt === 0
      ? ["bg-muted-foreground", "Connecting"]
      : live
        ? ["bg-online-dot", "Live"]
        : ["bg-ring-warning", formatRelativeTime(dataUpdatedAt) ?? "Stale"];

  return (
    <HStack
      space="sm"
      className="items-center rounded-full bg-card px-3 py-1.5"
      accessibilityLabel={live ? "Live data" : `Last update ${label}`}
    >
      <PulsingDot isOnline={live} colorClass={dot} />
      <Text className="text-xs font-medium text-foreground">{label}</Text>
    </HStack>
  );
}

export default function Header() {
  const now = useNow(5_000);
  const today = new Date(now).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <HStack className="items-start justify-between pt-2 pb-3">
      <VStack className="flex-1 pr-3">
        <Text className="text-3xl leading-9 font-bold tracking-tight text-foreground">
          {getGreeting(new Date(now))}
        </Text>
        <Text className="text-sm text-muted-foreground">{today}</Text>
      </VStack>
      <Freshness now={now} />
    </HStack>
  );
}
