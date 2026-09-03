import { useAppColors } from "@/src/hooks/useAppColors";
import {
  GlobeX,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  type LucideIcon,
} from "lucide-react-native";
import type { ColorValue } from "react-native";

/**
 * Signal quality config. The Icon and label text are static; the `color`
 * value is resolved from the active theme via `useAppColors()` so the
 * rendered color matches whatever variant is live.
 */
const QUALITY_BY_SIGNAL: Record<
  number,
  {
    text: string;
    Icon: LucideIcon;
    colorKey: keyof ReturnType<typeof useAppColors>;
  }
> = {
  0: { text: "no signal", Icon: GlobeX, colorKey: "ringDanger" },
  1: { text: "weak", Icon: SignalZero, colorKey: "ringDanger" },
  2: { text: "fair", Icon: SignalLow, colorKey: "ringWarning" },
  3: { text: "good", Icon: SignalMedium, colorKey: "ringSuccess" },
  4: { text: "strong", Icon: SignalHigh, colorKey: "ringSuccess" },
  5: { text: "excellent", Icon: Signal, colorKey: "primaryBlue" },
};

export type SignalConfig = {
  text: string;
  Icon: LucideIcon;
  color: ColorValue;
};

export default function useSignalConfig(
  signal: number | undefined,
): SignalConfig {
  const colors = useAppColors();
  const safe = signal ?? 0;
  const cfg = QUALITY_BY_SIGNAL[safe] ?? {
    text: "unknown",
    Icon: GlobeX,
    colorKey: "mutedForeground" as const,
  };
  return {
    text: cfg.text,
    Icon: cfg.Icon,
    color: colors[cfg.colorKey],
  };
}
