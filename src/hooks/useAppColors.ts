import { useUniwind } from "uniwind";

/**
 * Uniwind's `useCSSVariable` is tree-shaken — variables that no className
 * references resolve to `undefined`. Dashboard-specific tokens like
 * `--online-dot` and `--battery-ring` aren't referenced by any utility class
 * (they're used directly as native color values via SVG `stroke` etc.), so
 * `useCSSVariable` would fail for them. Keeping a JS-side mirror avoids the
 * tree-shaking entirely.
 *
 * If the values in `global.css` change, update this object too.
 */
const COLORS = {
  light: {
    primary: "rgb(108 92 231)",
    primaryForeground: "rgb(15 100 255)",
    primaryBlue: "rgb(100 149 237)",
    card: "rgb(255 255 255)",
    cardForeground: "rgb(51 51 51)",
    secondary: "rgb(161 201 242)",
    secondaryForeground: "rgb(51 51 51)",
    background: "rgb(249 249 249)",
    popover: "rgb(255 255 255)",
    popoverForeground: "rgb(51 51 51)",
    muted: "rgb(201 196 181)",
    mutedForeground: "rgb(110 110 110)",
    destructive: "rgb(239 68 68)",
    destructiveForeground: "rgb(255 255 255)",
    foreground: "rgb(51 51 51)",
    border: "rgb(212 212 212)",
    input: "rgb(212 212 212)",
    ring: "rgb(108 92 231)",
    accent: "rgb(37 99 235)",
    accentForeground: "rgb(255 255 255)",

    onlineDot: "rgb(15, 255, 15)",
    batteryRing: "rgb(15 118 86)",
    batteryRingTrack: "rgb(226 232 240)",
    dataRing: "rgb(37 99 235)",
    dataRingTrack: "rgb(226 232 240)",
    throughputLine: "rgb(55 138 221)",
    throughputFill: "rgb(55 138 221)",
    ringSuccess: "rgb(15 118 86)",
    ringWarning: "rgb(217 119 6)",
    ringDanger: "rgb(220 38 38)",

    chart1: "rgb(108 92 231)",
    chart2: "rgb(142 68 173)",
    chart3: "rgb(75 0 130)",
    chart4: "rgb(100 149 237)",
    chart5: "rgb(70 130 180)",
  },
  dark: {
    primary: "rgb(167 139 250)",
    primaryForeground: "rgb(15 23 42)",
    primaryBlue: "rgb(15 100 255)",
    card: "rgb(47 52 54)",
    cardForeground: "rgb(229 229 229)",
    secondary: "rgb(75 0 130)",
    secondaryForeground: "rgb(229 229 229)",
    background: "rgb(26 29 35)",
    popover: "rgb(47 52 54)",
    popoverForeground: "rgb(229 229 229)",
    muted: "rgb(68 68 68)",
    mutedForeground: "rgb(200 200 200)",
    destructive: "rgb(239 68 68)",
    destructiveForeground: "rgb(255 255 255)",
    foreground: "rgb(229 229 229)",
    border: "rgb(68 68 68)",
    input: "rgb(68 68 68)",
    ring: "rgb(167 139 250)",
    accent: "rgb(100 149 237)",
    accentForeground: "rgb(229 229 229)",

    onlineDot: "rgb(24, 237, 24)",
    batteryRing: "rgb(52 211 153)",
    batteryRingTrack: "rgb(68 68 68)",
    dataRing: "rgb(96 165 250)",
    dataRingTrack: "rgb(68 68 68)",
    throughputLine: "rgb(96 165 250)",
    throughputFill: "rgb(96 165 250)",
    ringSuccess: "rgb(52 211 153)",
    ringWarning: "rgb(251 191 36)",
    ringDanger: "rgb(248 113 113)",

    chart1: "rgb(167 139 250)",
    chart2: "rgb(196 125 217)",
    chart3: "rgb(147 112 219)",
    chart4: "rgb(100 149 237)",
    chart5: "rgb(144 180 200)",
  },
} as const;

export type AppColors = {
  [K in keyof (typeof COLORS)["light"]]: string;
};

export function useAppColors(paletteOverride?: "light" | "dark"): AppColors {
  const { theme } = useUniwind();
  return COLORS[paletteOverride ?? (theme === "dark" ? "dark" : "light")];
}
