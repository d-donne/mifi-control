import CircularProgress from "@/components/common/CircularProgress";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { PlugZap } from "lucide-react-native";
import { Box } from "../ui/box";
import { Center } from "../ui/center";

/**
 * Props:
 *   - progress: 0..1 (the ring fill)
 *   - activeColor / trackColor: theme token strings (useAppColors() values)
 *   - primary: big number/percentage text (e.g. "72%")
 *   - secondary: small label below the ring (e.g. "battery")
 */
export default function StatRingCard({
  progress,
  activeColor,
  trackColor,
  primary,
  secondary,
  charging,
}: {
  progress: number;
  activeColor: string;
  trackColor: string;
  primary: string;
  secondary: string;
  charging?: boolean;
}) {
  return (
    <VStack space="sm" className="bg-card rounded-2xl p-3 items-center">
      <CircularProgress
        progress={progress}
        activeColor={activeColor}
        trackColor={trackColor}
        radius={55}
        strokeWidth={8}
      >
        <Center className="relative">
          {charging && (
            <PlugZap color={"green"} className="absolute top-7 left-0" />
          )}
          <Text className="text-2xl font-bold text-foreground">{primary}</Text>
          <Text className="text-xs text-muted-foreground">{secondary}</Text>
        </Center>
      </CircularProgress>
    </VStack>
  );
}

/**
 * Hook returning the theme-mapped colors for the stat ring card. Two
 * variants: "battery" uses battery tokens, "data" uses data tokens.
 *
 * Returning the colors as a function result (rather than a JSX component)
 * keeps the call site free of conditional logic for the right token set.
 */
export function useStatRingColors(variant: "battery" | "data"): {
  active: string;
  track: string;
} {
  const colors = useAppColors();
  if (variant === "battery") {
    return { active: colors.batteryRing, track: colors.batteryRingTrack };
  }
  return { active: colors.dataRing, track: colors.dataRingTrack };
}
