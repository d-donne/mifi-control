import { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Box } from "./ui/box";
import { Center } from "./ui/center";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number; // Decimal values: e.g. 0.65 for 65%
  radius?: number; // Inner radius boundary configuration
  strokeWidth?: number;
  activeColor?: string; // Standard hex or RGB color string
  trackColor?: string;
  duration?: number;
  children?: React.ReactNode; // Centers your Gluestack texts & labels natively
}

export default function CircularProgress({
  progress,
  radius = 60,
  strokeWidth = 10,
  activeColor = "#3B82F6",
  trackColor = "#E5E7EB",
  duration = 800,
  children,
}: CircularProgressProps) {
  const animatedProgress = useSharedValue(0);
  const circumference = 2 * Math.PI * radius;
  const totalBoxSize = (radius + strokeWidth) * 2;

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, duration]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    // Box dimensions assigned safely using inline styles while layout uses Uniwind configuration
    <Box
      style={{ width: totalBoxSize, height: totalBoxSize }}
      className="relative items-center justify-center"
    >
      <Svg
        width={totalBoxSize}
        height={totalBoxSize}
        viewBox={`0 0 ${totalBoxSize} ${totalBoxSize}`}
        className="absolute top-0 left-0"
      >
        {/* Static Background Track Loop */}
        <Circle
          cx={totalBoxSize / 2}
          cy={totalBoxSize / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Reanimated Driven Foreground Arc */}
        <AnimatedCircle
          cx={totalBoxSize / 2}
          cy={totalBoxSize / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${totalBoxSize / 2} ${totalBoxSize / 2})`}
        />
      </Svg>

      {/* Centered Overlay Layer */}
      {children && (
        <Center className="absolute">{children}</Center>
      )}
    </Box>
  );
}
