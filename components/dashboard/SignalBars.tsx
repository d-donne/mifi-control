import { Box } from "@/components/ui/box";

const BARS = 5;

export default function SignalBars({
  level,
  color,
  emptyColor,
  height = 34,
}: {
  level: number;
  color: string;
  emptyColor: string;
  height?: number;
}) {
  return (
    <Box
      className="flex-row items-end"
      style={{ height, gap: 4 }}
      accessibilityRole="image"
      accessibilityLabel={`Signal ${level} of ${BARS}`}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <Box
          key={i}
          style={{
            width: 6,
            height: (height * (i + 1)) / BARS,
            borderRadius: 2,
            backgroundColor: i < level ? color : emptyColor,
          }}
        />
      ))}
    </Box>
  );
}
