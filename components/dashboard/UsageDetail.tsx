import ConfirmDialog from "@/components/common/ConfirmDialog";
import { TABULAR } from "@/components/dashboard/RingCard";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatBytes, formatDuration, parseDataLimit } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  useClearTraffic,
  useDataPlan,
  useMonthStatistics,
} from "@/src/hooks/useDataUsage";
import { useTraffic } from "@/src/hooks/useDeviceStatus";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";

function cycleStart(date: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function UsageRow({
  title,
  detail,
  value,
}: {
  title: string;
  detail?: string;
  value: string;
}) {
  return (
    <HStack className="items-center gap-3 px-5 py-3.5">
      <VStack className="flex-1">
        <Text className="text-foreground">{title}</Text>
        {detail && (
          <Text className="text-xs text-muted-foreground">{detail}</Text>
        )}
      </VStack>
      <Text className="font-semibold text-foreground" style={TABULAR}>
        {value}
      </Text>
    </HStack>
  );
}

const Divider = () => <Box className="mx-5 h-px bg-secondary" />;

export default function UsageDetail() {
  const router = useRouter();
  const colors = useAppColors();
  const { data: month } = useMonthStatistics();
  const { data: traffic } = useTraffic();
  const { data: plan } = useDataPlan();
  const clear = useClearTraffic();
  const [confirming, setConfirming] = useState(false);

  const down = month?.CurrentMonthDownload ?? 0;
  const up = month?.CurrentMonthUpload ?? 0;
  const used = down + up;
  const limit =
    plan?.SetMonthData === 1 ? parseDataLimit(plan.DataLimit) : null;
  const cap = limit && limit.bytes > 0 ? limit : null;
  const ratio = cap ? Math.min(1, used / cap.bytes) : 0;
  const over =
    cap !== null && plan !== undefined && ratio * 100 >= plan.MonthThreshold;
  const since = cycleStart(month?.MonthLastClearTime);

  return (
    <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
      <VStack space="lg">
        <HStack className="items-center">
          <Heading size="xl" className="flex-1">
            Data usage
          </Heading>
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>

        <VStack className="gap-3 rounded-3xl bg-card px-5 py-4">
          <Text className="text-sm text-muted-foreground">
            {since ? `This cycle, since ${since}` : "This cycle"}
          </Text>
          <Text
            className="text-5xl leading-none font-extrabold text-foreground"
            style={TABULAR}
          >
            {month ? formatBytes(used) : "—"}
          </Text>
          {month && (
            <Text className="text-sm text-muted-foreground" style={TABULAR}>
              {formatBytes(down)} down · {formatBytes(up)} up · online{" "}
              {formatDuration(month.MonthDuration)}
            </Text>
          )}
          {cap && (
            <VStack className="gap-1.5 pt-1">
              <Box
                className="h-2 overflow-hidden rounded-full"
                style={{ backgroundColor: colors.ringTrack }}
              >
                <Box
                  className="h-full rounded-full"
                  style={{
                    width: `${ratio * 100}%`,
                    backgroundColor: over ? colors.ringWarning : colors.primary,
                  }}
                />
              </Box>
              <Text className="text-xs text-muted-foreground" style={TABULAR}>
                {Math.round(ratio * 100)}% of your {cap.amount} {cap.unit} plan
              </Text>
            </VStack>
          )}
        </VStack>

        <VStack className="overflow-hidden rounded-3xl bg-card">
          <UsageRow
            title="Today"
            detail={
              month
                ? `Online ${formatDuration(month.CurrentDayDuration)}`
                : undefined
            }
            value={month ? formatBytes(month.CurrentDayUsed) : "—"}
          />
          <Divider />
          <UsageRow
            title="This connection"
            detail="Since the MiFi last connected"
            value={
              traffic
                ? formatBytes(traffic.CurrentDownload + traffic.CurrentUpload)
                : "—"
            }
          />
          <Divider />
          <UsageRow
            title="All time"
            detail={
              traffic
                ? `Online ${formatDuration(traffic.TotalConnectTime)}`
                : undefined
            }
            value={
              traffic
                ? formatBytes(traffic.TotalDownload + traffic.TotalUpload)
                : "—"
            }
          />
        </VStack>

        <VStack className="overflow-hidden rounded-3xl bg-card">
          <Pressable
            onPress={() => router.replace("/data-plan")}
            className="px-5 py-4 data-[active=true]:opacity-70"
          >
            <Text className="font-medium text-foreground">
              {cap ? "Edit data plan" : "Set a data plan"}
            </Text>
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => setConfirming(true)}
            disabled={clear.isPending}
            className="px-5 py-4 data-[active=true]:opacity-70"
          >
            <Text className="font-medium text-destructive">
              {clear.isPending ? "Clearing…" : "Clear statistics"}
            </Text>
            {clear.error && (
              <Text className="text-xs text-muted-foreground">
                Couldn&apos;t clear: {clear.error.message}
              </Text>
            )}
          </Pressable>
        </VStack>
      </VStack>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title="Clear statistics?"
        message="The MiFi resets its usage counters. This can't be undone."
        confirmLabel="Clear"
        destructive
        onConfirm={() => clear.mutate()}
      />
    </ScrollView>
  );
}
