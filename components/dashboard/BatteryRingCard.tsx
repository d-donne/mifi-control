import { getProgress } from "@/components/common/CircularProgress";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import { PlugZap } from "lucide-react-native";
import StatRingCard from "./StatRingCard";

export default function BatteryRingCard() {
  const colors = useAppColors();

  const { data: status } = useStatus();

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
