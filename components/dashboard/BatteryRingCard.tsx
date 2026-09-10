import { getProgress } from "@/components/common/CircularProgress";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useQuery } from "@tanstack/react-query";
import { PlugZap } from "lucide-react-native";
import StatRingCard from "./StatRingCard";

export default function BatteryRingCard() {
  const client = useHiLinkClient();
  const colors = useAppColors();

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getMonitoring("status"),
    refetchInterval: 8000,
  });

  const percent = status?.BatteryPercent ?? 0;
  const charging = Boolean(status?.BatteryStatus);

  return (
    <StatRingCard
      progress={getProgress(percent, 100)}
      activeColor={colors.batteryRing}
      trackColor={colors.batteryRingTrack}
      primary={`${percent}%`}
      secondary="battery"
      overlay={
        charging && (
          <PlugZap size={14} color={colors.batteryRing} strokeWidth={2.5} />
        )
      }
    />
  );
}
