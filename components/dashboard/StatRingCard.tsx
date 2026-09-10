import CircularProgress from "@/components/common/CircularProgress";
import { Center } from "../ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { ReactNode } from "react";

/**
 * Props:
 *   - progress: 0..1 (the ring fill). prefer using getProgress
 *   - activeColor / trackColor: theme token strings (useAppColors() values)
 *   - primary: big number/percentage text (e.g. "72%")
 *   - secondary: small label below the ring (e.g. "battery")
 *   - overlay: optional extra node rendered in the center stack
 */
export default function StatRingCard({
  progress,
  activeColor,
  trackColor,
  primary,
  secondary,
  overlay,
}: {
  progress: number;
  activeColor: string;
  trackColor: string;
  primary: string;
  secondary: string;
  overlay?: ReactNode;
}) {
  return (
    <VStack space="sm" className="bg-card rounded-2xl p-3 items-center">
      <CircularProgress
        progress={progress}
        activeColor={activeColor}
        trackColor={trackColor}
        radius={58}
        strokeWidth={8}
      >
        <Center>
          <Text className="text-2xl font-bold text-foreground">{primary}</Text>
          <Text className="text-xs text-muted-foreground">{secondary}</Text>
          {overlay}
        </Center>
      </CircularProgress>
    </VStack>
  );
}
