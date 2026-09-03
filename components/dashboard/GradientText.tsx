import { ReactNode } from "react";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export default function GradientText({
  text,
  colors,
  fontSize = 36,
  fontWeight = "700",
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  width = 200,
  height,
}: {
  text: ReactNode;
  colors: readonly [string, string, ...string[]];
  fontSize?: number;
  fontWeight?: "400" | "500" | "600" | "700" | "800" | "900";
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  width?: number;
  height?: number;
}) {
  const h = height ?? Math.ceil(fontSize * 1.2);

  return (
    <Svg width={width} height={h}>
      <Defs>
        <LinearGradient
          id="grad"
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
        >
          {colors.map((c, i) => (
            <Stop
              key={i}
              offset={
                colors.length === 1
                  ? "0"
                  : `${(i / (colors.length - 1)) * 100}%`
              }
              stopColor={c}
              stopOpacity={1}
            />
          ))}
        </LinearGradient>
      </Defs>
      <SvgText
        x={0}
        y={h - Math.ceil(fontSize * 0.2)}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fill="url(#grad)"
      >
        {String(text)}
      </SvgText>
    </Svg>
  );
}
