import { Text } from "@/components/ui/text";
import { PlugZap } from "@/components/icons";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import RingCard from "./RingCard";

export default function BatteryRingCard() {
  const colors = useAppColors();
  const { data: status } = useStatus();
  const percent = status?.BatteryPercent;
  const charging = status?.BatteryStatus === 1;
  const level = percent ?? 0;
  const color =
    level <= 15
      ? colors.ringDanger
      : level <= 30
        ? colors.ringWarning
        : colors.batteryRing;

  return (
    <RingCard
      segments={percent === undefined ? [] : [{ value: level / 100, color }]}
      value={percent === undefined ? "—" : `${percent}%`}
      label="battery"
      footer={
        status &&
        (charging ? (
          <>
            <PlugZap size={13} color={colors.batteryRing} strokeWidth={2.5} />
            <Text
              className="text-xs font-medium"
              style={{ color: colors.batteryRing }}
            >
              Charging
            </Text>
          </>
        ) : (
          <Text className="text-xs text-muted-foreground">On battery</Text>
        ))
      }
    />
  );
}
