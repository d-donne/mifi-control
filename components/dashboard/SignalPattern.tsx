import { useAppColors } from "@/src/hooks/useAppColors";
import Svg, { Circle } from "react-native-svg";

/**
 * Decorative concentric "radar" rings for the hero card's top-right
 * corner. Mirrors the design in the dashboard mock.
 *
 * The SVG is given a fixed 160×160 canvas positioned absolutely in the
 * top-right of the card. The rings are drawn around the center of that
 * canvas, with radii small enough that all four fit inside the canvas
 * without clipping. Overflow on the parent is `hidden` (in HeroCard), so
 * any further drift is invisible.
 *
 * Color resolves from the active theme at low opacity, so the rings are
 * a subtle decoration against the brand-purple card background.
 */
export default function SignalPattern() {
  const colors = useAppColors("dark");

  return (
    <Svg
      width={160}
      height={160}
      viewBox="0 0 160 160"
      style={{
        position: "absolute",
        top: -40,
        right: -40,
        opacity: 0.6,
      }}
    >
      {[32, 50, 72].map((r) => (
        <Circle
          key={r}
          cx={90}
          cy={52}
          r={r}
          stroke={colors.chart5}
          strokeOpacity={0.7}
          strokeWidth={1.2}
          fill="none"
        />
      ))}
    </Svg>
  );
}
