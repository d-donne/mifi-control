import { getProgress } from "@/components/common/CircularProgress";
import { getMonitoring } from "@/src/api/routes";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { PlugZap } from "lucide-react-native";
import StatRingCard from "./StatRingCard";

export default function BatteryRingCard() {
  const colors = useAppColors();

  const { data: status } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
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
