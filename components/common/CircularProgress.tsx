import { Box } from "@/components/ui/box";
import { useEffect, type ReactNode } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingSegment = { value: number; color: string };

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function Arc({
  center,
  radius,
  strokeWidth,
  start,
  length,
  color,
  lineCap,
}: {
  center: number;
  radius: number;
  strokeWidth: number;
  start: number;
  length: number;
  color: string;
  lineCap: "round" | "butt";
}) {
  const circumference = 2 * Math.PI * radius;
  const drawn = useSharedValue(0);

  useEffect(() => {
    drawn.set(
      withTiming(length, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [length, drawn]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - drawn.get()),
  }));

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap={lineCap}
      fill="none"
      strokeDasharray={circumference}
      animatedProps={animatedProps}
      transform={`rotate(${-90 + start * 360} ${center} ${center})`}
    />
  );
}

function layoutArcs(segments: RingSegment[], gap: number) {
  let cursor = 0;
  return segments.map((segment) => {
    const value = clamp01(segment.value);
    const start = cursor + gap / 2;
    cursor += value;
    return {
      start,
      length: value > 0 ? Math.max(0.001, value - gap) : 0,
      color: segment.color,
    };
  });
}

/**
 * Segments are fractions of the full circle drawn one after another from 12
 * o'clock; several segments are separated by a gap their round caps can't close.
 */
export default function CircularProgress({
  segments,
  size = 128,
  strokeWidth = 10,
  trackColor,
  lineCap = "round",
  children,
}: {
  segments: RingSegment[];
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  /** "butt" keeps small remainders visible; round caps cover them. */
  lineCap?: "round" | "butt";
  children?: ReactNode;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap =
    segments.length < 2
      ? 0
      : (lineCap === "round" ? strokeWidth + 5 : 2.5) / circumference;

  const arcs = layoutArcs(segments, gap);

  return (
    <Box
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {arcs.map((arc, i) =>
          arc.length === 0 ? null : (
            <Arc
              key={i}
              center={center}
              radius={radius}
              strokeWidth={strokeWidth}
              start={arc.start}
              length={arc.length}
              color={arc.color}
              lineCap={lineCap}
            />
          ),
        )}
      </Svg>
      {children}
    </Box>
  );
}
