import { useAppColors } from "@/src/hooks/useAppColors";
import type { DimensionValue } from "react-native";
import Animated from "react-native-reanimated";

const pulse = {
  from: { opacity: 1 },
  to: { opacity: 0.45 },
};

export default function Placeholder({
  width,
  height,
  radius = 8,
  onCard = false,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  onCard?: boolean;
}) {
  const colors = useAppColors();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: onCard ? colors.background : colors.card,
        animationName: pulse,
        animationDuration: "900ms",
        animationIterationCount: "infinite",
        animationDirection: "alternate",
        animationTimingFunction: "ease-in-out",
      }}
    />
  );
}
