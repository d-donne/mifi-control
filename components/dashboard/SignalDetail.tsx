import { TABULAR } from "@/components/dashboard/RingCard";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { DeviceSignal } from "@/src/api/types";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useSignal } from "@/src/hooks/useDeviceStatus";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";

type Grade = 0 | 1 | 2 | 3;
const GRADE_WORDS = ["Poor", "Fair", "Good", "Excellent"] as const;

interface Metric {
  name: string;
  hint: string;
  unit: string;
  /** Grade thresholds, ascending: fair, good, excellent. */
  steps: [number, number, number];
  /** Drawn range of the scale. */
  range: [number, number];
}

const RSRP: Metric = {
  name: "Signal strength",
  hint: "RSRP · how loud the tower is",
  unit: "dBm",
  steps: [-100, -90, -80],
  range: [-120, -70],
};
const SINR: Metric = {
  name: "Signal clarity",
  hint: "SINR · signal over noise; drives speed",
  unit: "dB",
  steps: [0, 13, 20],
  range: [-5, 30],
};
const RSRQ: Metric = {
  name: "Signal quality",
  hint: "RSRQ · how busy or crowded the cell is",
  unit: "dB",
  steps: [-20, -15, -10],
  range: [-25, -5],
};

const LTE_BAND_MHZ: Record<number, string> = {
  1: "2100 MHz",
  3: "1800 MHz",
  7: "2600 MHz",
  8: "900 MHz",
  20: "800 MHz",
  28: "700 MHz",
  38: "2600 MHz TDD",
  40: "2300 MHz TDD",
  41: "2500 MHz TDD",
};

function grade(metric: Metric, value: number): Grade {
  const [fair, good, excellent] = metric.steps;
  return value >= excellent ? 3 : value >= good ? 2 : value >= fair ? 1 : 0;
}

function overallGrade(signal: DeviceSignal): Grade | null {
  const grades = [
    signal.rsrp !== null ? grade(RSRP, signal.rsrp) : null,
    signal.sinr !== null ? grade(SINR, signal.sinr) : null,
  ].filter((g): g is Grade => g !== null);
  return grades.length
    ? grades.reduce<Grade>((low, g) => (g < low ? g : low), 3)
    : null;
}

function networkName(mode: number): string {
  return mode === 7 ? "4G LTE" : mode === 2 ? "3G" : mode === 0 ? "2G" : "—";
}

function useGradeColor() {
  const colors = useAppColors();
  return (g: Grade) =>
    g === 0
      ? colors.ringDanger
      : g === 1
        ? colors.ringWarning
        : colors.ringSuccess;
}

function MetricRow({ metric, value }: { metric: Metric; value: number }) {
  const colors = useAppColors();
  const colorOf = useGradeColor();
  const g = grade(metric, value);
  const [lo, hi] = metric.range;
  const fill = Math.min(1, Math.max(0.03, (value - lo) / (hi - lo)));

  return (
    <VStack className="gap-2 px-5 py-4">
      <HStack className="items-baseline gap-3">
        <VStack className="flex-1">
          <Text className="font-medium text-foreground">{metric.name}</Text>
          <Text className="text-xs text-muted-foreground">{metric.hint}</Text>
        </VStack>
        <VStack className="items-end">
          <Text className="text-lg font-bold text-foreground" style={TABULAR}>
            {value}
            <Text className="text-sm font-normal text-muted-foreground">
              {" "}
              {metric.unit}
            </Text>
          </Text>
          <Text className="text-xs font-semibold" style={{ color: colorOf(g) }}>
            {GRADE_WORDS[g]}
          </Text>
        </VStack>
      </HStack>
      <Box
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: colors.ringTrack }}
      >
        <Box
          className="h-full rounded-full"
          style={{ width: `${fill * 100}%`, backgroundColor: colorOf(g) }}
        />
      </Box>
    </VStack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="justify-between px-5 py-3">
      <Text className="text-muted-foreground">{label}</Text>
      <Text className="text-foreground" style={TABULAR} selectable>
        {value}
      </Text>
    </HStack>
  );
}

const Divider = () => <Box className="mx-5 h-px bg-secondary" />;

export default function SignalDetail() {
  const router = useRouter();
  const colorOf = useGradeColor();
  const { data: signal, error } = useSignal();
  const overall = signal ? overallGrade(signal) : null;
  const band = signal?.band ?? null;
  const metrics = signal
    ? (
        [
          [RSRP, signal.rsrp],
          [SINR, signal.sinr],
          [RSRQ, signal.rsrq],
        ] as const
      ).filter((m): m is readonly [Metric, number] => m[1] !== null)
    : [];

  return (
    <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
      <VStack space="lg">
        <HStack className="items-center">
          <Heading size="xl" className="flex-1">
            Signal
          </Heading>
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>

        <VStack className="gap-1 rounded-3xl bg-card px-5 py-4">
          <Text
            className="text-4xl font-extrabold"
            style={{
              color: overall !== null ? colorOf(overall) : undefined,
            }}
          >
            {overall !== null ? GRADE_WORDS[overall] : signal ? "—" : "…"}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {signal
              ? [
                  networkName(signal.mode),
                  band !== null &&
                    `Band ${band}${LTE_BAND_MHZ[band] ? ` · ${LTE_BAND_MHZ[band]}` : ""}`,
                  signal.dlBandwidth && `${signal.dlBandwidth} wide`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : error
                ? `Couldn't read the signal: ${error.message}`
                : "Reading the signal…"}
          </Text>
        </VStack>

        {metrics.length > 0 && (
          <VStack className="overflow-hidden rounded-3xl bg-card">
            {metrics.map(([metric, value], i) => (
              <VStack key={metric.name}>
                {i > 0 && <Divider />}
                <MetricRow metric={metric} value={value} />
              </VStack>
            ))}
          </VStack>
        )}

        {signal && (signal.cellId || signal.pci) && (
          <VStack className="overflow-hidden rounded-3xl bg-card">
            {signal.cellId !== "" && (
              <DetailRow label="Cell ID" value={signal.cellId} />
            )}
            {signal.cellId !== "" && signal.pci !== "" && <Divider />}
            {signal.pci !== "" && (
              <DetailRow label="Physical cell" value={signal.pci} />
            )}
          </VStack>
        )}
      </VStack>
    </ScrollView>
  );
}
