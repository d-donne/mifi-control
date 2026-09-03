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
    primary: "108 92 231",
    primaryForeground: "15 100 255",
    primaryBlue: "100 149 237",
    card: "255 255 255",
    cardForeground: "51 51 51",
    secondary: "161 201 242",
    secondaryForeground: "51 51 51",
    background: "249 249 249",
    popover: "255 255 255",
    popoverForeground: "51 51 51",
    muted: "201 196 181",
    mutedForeground: "110 110 110",
    destructive: "239 68 68",
    destructiveForeground: "255 255 255",
    foreground: "51 51 51",
    border: "212 212 212",
    input: "212 212 212",
    ring: "108 92 231",
    accent: "37 99 235",
    accentForeground: "255 255 255",

    onlineDot: "15, 255, 15",
    batteryRing: "15 118 86",
    batteryRingTrack: "226 232 240",
    dataRing: "29 158 117",
    dataRingTrack: "226 232 240",
    throughputLine: "55 138 221",
    throughputFill: "55 138 221",
    ringSuccess: "15 118 86",
    ringWarning: "217 119 6",
    ringDanger: "220 38 38",

    chart1: "108 92 231",
    chart2: "142 68 173",
    chart3: "75 0 130",
    chart4: "100 149 237",
    chart5: "70 130 180",
  },
  dark: {
    primary: "167 139 250",
    primaryForeground: "15 23 42",
    primaryBlue: "15 100 255",
    card: "47 52 54",
    cardForeground: "229 229 229",
    secondary: "75 0 130",
    secondaryForeground: "229 229 229",
    background: "26 29 35",
    popover: "47 52 54",
    popoverForeground: "229 229 229",
    muted: "68 68 68",
    mutedForeground: "200 200 200",
    destructive: "239 68 68",
    destructiveForeground: "255 255 255",
    foreground: "229 229 229",
    border: "68 68 68",
    input: "68 68 68",
    ring: "167 139 250",
    accent: "100 149 237",
    accentForeground: "229 229 229",

    onlineDot: "24, 237, 24",
    batteryRing: "52 211 153",
    batteryRingTrack: "68 68 68",
    dataRing: "52 211 153",
    dataRingTrack: "68 68 68",
    throughputLine: "96 165 250",
    throughputFill: "96 165 250",
    ringSuccess: "52 211 153",
    ringWarning: "251 191 36",
    ringDanger: "248 113 113",

    chart1: "167 139 250",
    chart2: "196 125 217",
    chart3: "147 112 219",
    chart4: "100 149 237",
    chart5: "144 180 200",
  },
} as const;

/** Convert "239 68 68" → "rgb(239, 68, 68)" for use as a native color value. */
function toNativeColor(rgb: string): string {
  return `rgb(${rgb})`;
}

export type AppColors = {
  [K in keyof (typeof COLORS)["light"]]: string;
};

export function useAppColors(paletteOverride?: "light" | "dark"): AppColors {
  const { theme } = useUniwind();
  let palette;

  if (paletteOverride) {
    palette = COLORS[paletteOverride];
  } else {
    palette = theme === "dark" ? COLORS.dark : COLORS.light;
  }

  const out = {} as Record<string, string>;
  for (const key in palette) {
    out[key] = toNativeColor(palette[key as keyof typeof palette]);
  }
  return out as AppColors;
}
