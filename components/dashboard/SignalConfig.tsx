import { useAppColors, type AppColors } from "@/src/hooks/useAppColors";

const QUALITY_BY_SIGNAL: Record<
  number,
  { text: string; colorKey: keyof AppColors }
> = {
  0: { text: "No signal", colorKey: "ringDanger" },
  1: { text: "Weak", colorKey: "ringDanger" },
  2: { text: "Fair", colorKey: "ringWarning" },
  3: { text: "Good", colorKey: "ringSuccess" },
  4: { text: "Strong", colorKey: "ringSuccess" },
  5: { text: "Excellent", colorKey: "ringSuccess" },
};

export type SignalConfig = { level: number; text: string; color: string };

export default function useSignalConfig(
  signal: number | undefined,
  scheme?: "light" | "dark",
): SignalConfig {
  const colors = useAppColors(scheme);
  const level = signal ?? 0;
  const quality = QUALITY_BY_SIGNAL[level] ?? {
    text: "Unknown",
    colorKey: "mutedForeground" as const,
  };
  return { level, text: quality.text, color: colors[quality.colorKey] };
}
