import { getProgress } from "@/components/common/CircularProgress";
import { Text } from "@/components/ui/text";
import { formatBytes, parseDataLimit } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useDataPlan, useMonthStatistics } from "@/src/hooks/useDataUsage";
import StatRingCard from "./StatRingCard";

/**
 * Usage for the current billing cycle (download + upload, which is what
 * carriers count). The ring measures against the device's data plan only
 * when one is configured (`SetMonthData=1`); otherwise it shows usage alone.
 */
export default function DataRingCard() {
  const colors = useAppColors();
  const { data: month } = useMonthStatistics();
  const { data: plan } = useDataPlan();

  const used =
    (month?.CurrentMonthDownload ?? 0) + (month?.CurrentMonthUpload ?? 0);
  const limit =
    plan?.SetMonthData === 1 ? parseDataLimit(plan.DataLimit) : null;
  const capBytes = limit && limit.bytes > 0 ? limit.bytes : null;

  const ratio = capBytes ? used / capBytes : 0;
  const activeColor =
    ratio >= 1
      ? colors.ringDanger
      : capBytes &&
          plan &&
          plan.MonthThreshold > 0 &&
          ratio * 100 >= plan.MonthThreshold
        ? colors.ringWarning
        : colors.dataRing;

  return (
    <StatRingCard
      progress={capBytes ? getProgress(used, capBytes) : 0}
      activeColor={activeColor}
      trackColor={colors.dataRingTrack}
      primary={month ? formatBytes(used) : "—"}
      secondary={
        capBytes && limit ? `of ${limit.amount} ${limit.unit}` : "this month"
      }
      overlay={
        month && (
          <Text className="text-[10px] text-muted-foreground">
            {formatBytes(month.CurrentDayUsed)} today
          </Text>
        )
      }
    />
  );
}
