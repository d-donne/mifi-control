import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { ArrowDown, ArrowUp } from "@/components/icons";
import { formatBytes, parseDataLimit } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useDataPlan, useMonthStatistics } from "@/src/hooks/useDataUsage";
import { useRouter } from "expo-router";
import RingCard, { TABULAR } from "./RingCard";

// Carriers bill download + upload together, so "used" is their sum.
export default function DataRingCard() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: month } = useMonthStatistics();
  const { data: plan } = useDataPlan();

  const down = month?.CurrentMonthDownload ?? 0;
  const up = month?.CurrentMonthUpload ?? 0;
  const used = down + up;
  const limit =
    plan?.SetMonthData === 1 ? parseDataLimit(plan.DataLimit) : null;
  const cap = limit && limit.bytes > 0 ? limit : null;
  const ratio = cap ? used / cap.bytes : 0;
  const capColor =
    ratio >= 1
      ? colors.ringDanger
      : plan && plan.MonthThreshold > 0 && ratio * 100 >= plan.MonthThreshold
        ? colors.ringWarning
        : colors.dataRing;

  const segments = !month
    ? []
    : cap
      ? [{ value: ratio, color: capColor }]
      : used > 0
        ? [
            { value: down / used, color: colors.dataRing },
            { value: up / used, color: colors.dataRingUpload },
          ]
        : [];

  return (
    <Pressable
      onPress={() => router.push("/usage")}
      accessibilityRole="button"
      accessibilityLabel={
        month
          ? `Data this month ${formatBytes(used)}: ${formatBytes(down)} down, ${formatBytes(up)} up. Shows usage details`
          : "Data this month. Shows usage details"
      }
      className="flex-1 data-[active=true]:opacity-80"
    >
      <RingCard
        segments={segments}
        value={month ? formatBytes(used) : "—"}
        label="this month"
        detail={
          month && (
            <Text
              className="mt-0.5 text-[10px] text-muted-foreground"
              style={TABULAR}
            >
              {formatBytes(month.CurrentDayUsed)} today
            </Text>
          )
        }
        footer={
          month &&
          (cap ? (
            <Text className="text-xs text-muted-foreground" style={TABULAR}>
              {Math.round(ratio * 100)}% of {cap.amount} {cap.unit}
            </Text>
          ) : (
            <>
              <ArrowDown size={12} color={colors.dataRing} strokeWidth={2.5} />
              <Text className="text-xs text-foreground" style={TABULAR}>
                {formatBytes(down)}
              </Text>
              <ArrowUp
                size={12}
                color={colors.dataRingUpload}
                strokeWidth={2.5}
                style={{ marginLeft: 6 }}
              />
              <Text className="text-xs text-foreground" style={TABULAR}>
                {formatBytes(up)}
              </Text>
            </>
          ))
        }
      />
    </Pressable>
  );
}
