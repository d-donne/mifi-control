import { usePalette } from "@/src/hooks/usePalette";
import {
  PALETTES,
  type ColorTokens,
  type PaletteId,
} from "@/src/theme/palettes";
import { useUniwind } from "uniwind";

export type AppColors = ColorTokens;

/** Native colour props (SVG, icons) can't read CSS variables; this resolves the active palette. */
export function useAppColors(schemeOverride?: "light" | "dark"): AppColors {
  const { theme } = useUniwind();
  const palette = usePalette((s) => s.palette);
  return PALETTES[palette][
    schemeOverride ?? (theme === "dark" ? "dark" : "light")
  ];
}

export function paletteColors(
  id: PaletteId,
  scheme: "light" | "dark",
): AppColors {
  return PALETTES[id][scheme];
}

/** `rgb(r g b)` from this palette with an alpha channel, for tinted fills. */
export function withAlpha(color: string, alpha: number): string {
  return color.replace(")", ` / ${alpha})`);
}
