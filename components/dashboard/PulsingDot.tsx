import { Box } from "@/components/ui/box";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Small status dot that pulses (opacity 1 → 0.3 → 1) when online.
 * Animation: 2s loop, ease-in-out, repeated forever via Reanimated.
 */
export default function PulsingDot({
  isOnline,
  colorClass = "bg-primary",
}: {
  isOnline: boolean;
  colorClass?: string;
}) {
  const opacity = useSharedValue(isOnline ? 1 : 0.4);

  useEffect(() => {
    if (isOnline) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(0.4, { duration: 300 });
    }
  }, [isOnline, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4 }, animatedStyle]}
    >
      <Box className={`size-2.5 rounded-full ${colorClass}`} />
    </Animated.View>
  );
}
