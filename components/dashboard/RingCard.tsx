import CircularProgress, {
  type RingSegment,
} from "@/components/common/CircularProgress";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/src/hooks/useAppColors";
import type { ReactNode } from "react";

export const TABULAR = { fontVariant: ["tabular-nums" as const] };

const RING_SIZE = 124;
const RING_STROKE = 11;

export default function RingCard({
  segments,
  value,
  label,
  detail,
  footer,
}: {
  segments: RingSegment[];
  value: string;
  label: string;
  detail?: ReactNode;
  footer: ReactNode;
}) {
  const colors = useAppColors();

  return (
    <Box className="flex-1 items-center gap-3 rounded-2xl bg-card px-3 pt-5 pb-4">
      <CircularProgress
        segments={segments}
        size={RING_SIZE}
        strokeWidth={RING_STROKE}
        trackColor={colors.ringTrack}
      >
        <Box
          className="items-center"
          style={{ width: RING_SIZE - 2 * RING_STROKE - 26 }}
        >
          <Text
            className="text-2xl leading-7 font-bold text-foreground"
            style={TABULAR}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </Text>
          <Text className="text-[11px] text-muted-foreground">{label}</Text>
          {detail}
        </Box>
      </CircularProgress>
      <Box className="h-4 flex-row items-center justify-center gap-1">
        {footer}
      </Box>
    </Box>
  );
}
