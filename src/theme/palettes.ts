export const PALETTE_IDS = ["kente", "harmattan", "cocoa", "sobolo"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const DEFAULT_PALETTE: PaletteId = "kente";

type Rgb = `rgb(${number} ${number} ${number})`;

export type ColorTokens = {
  primary: Rgb;
  primaryForeground: Rgb;
  card: Rgb;
  cardForeground: Rgb;
  secondary: Rgb;
  secondaryForeground: Rgb;
  background: Rgb;
  popover: Rgb;
  popoverForeground: Rgb;
  muted: Rgb;
  mutedForeground: Rgb;
  destructive: Rgb;
  destructiveForeground: Rgb;
  foreground: Rgb;
  border: Rgb;
  input: Rgb;
  ring: Rgb;
  accent: Rgb;
  accentForeground: Rgb;
  hero: Rgb;
  heroForeground: Rgb;
  heroMuted: Rgb;
  onlineDot: Rgb;
  batteryRing: Rgb;
  dataRing: Rgb;
  dataRingUpload: Rgb;
  ringTrack: Rgb;
  ringSuccess: Rgb;
  ringWarning: Rgb;
  ringDanger: Rgb;
  chart1: Rgb;
  chart2: Rgb;
  chart3: Rgb;
  chart4: Rgb;
  chart5: Rgb;
};

export type Palette = {
  name: string;
  light: ColorTokens;
  dark: ColorTokens;
  /** Woven band along the hero's foot; widths are relative. */
  weave: { color: keyof ColorTokens; width: number }[];
};

const KENTE_WEAVE: Palette["weave"] = [
  { color: "primary", width: 6 },
  { color: "ringDanger", width: 2 },
  { color: "batteryRing", width: 4 },
  { color: "primary", width: 1 },
  { color: "heroForeground", width: 2 },
  { color: "primary", width: 8 },
  { color: "batteryRing", width: 2 },
  { color: "ringDanger", width: 4 },
  { color: "primary", width: 3 },
  { color: "heroForeground", width: 1 },
  { color: "batteryRing", width: 5 },
];

const SHARED_WEAVE: Palette["weave"] = [
  { color: "primary", width: 6 },
  { color: "dataRingUpload", width: 2 },
  { color: "batteryRing", width: 4 },
  { color: "primary", width: 1 },
  { color: "heroMuted", width: 2 },
  { color: "primary", width: 8 },
  { color: "batteryRing", width: 2 },
  { color: "dataRingUpload", width: 4 },
  { color: "primary", width: 3 },
  { color: "heroMuted", width: 1 },
  { color: "batteryRing", width: 5 },
];

export const PALETTES: Record<PaletteId, Palette> = {
  kente: {
    name: "Kente gold",
    weave: KENTE_WEAVE,
    dark: {
      primary: "rgb(233 169 58)",
      primaryForeground: "rgb(26 20 8)",
      card: "rgb(30 27 23)",
      cardForeground: "rgb(244 239 230)",
      secondary: "rgb(46 42 35)",
      secondaryForeground: "rgb(244 239 230)",
      background: "rgb(17 16 14)",
      popover: "rgb(30 27 23)",
      popoverForeground: "rgb(244 239 230)",
      muted: "rgb(46 42 35)",
      mutedForeground: "rgb(168 159 146)",
      destructive: "rgb(240 104 96)",
      destructiveForeground: "rgb(26 20 8)",
      foreground: "rgb(244 239 230)",
      border: "rgb(46 42 35)",
      input: "rgb(46 42 35)",
      ring: "rgb(236 178 74)",
      accent: "rgb(236 178 74)",
      accentForeground: "rgb(26 20 8)",
      hero: "rgb(15 68 52)",
      heroForeground: "rgb(255 248 234)",
      heroMuted: "rgb(165 205 187)",
      onlineDot: "rgb(61 203 138)",
      batteryRing: "rgb(61 203 138)",
      dataRing: "rgb(233 169 58)",
      dataRingUpload: "rgb(247 224 174)",
      ringTrack: "rgb(46 42 35)",
      ringSuccess: "rgb(61 203 138)",
      ringWarning: "rgb(240 128 48)",
      ringDanger: "rgb(235 87 87)",
      chart1: "rgb(233 169 58)",
      chart2: "rgb(61 203 138)",
      chart3: "rgb(235 87 87)",
      chart4: "rgb(106 160 230)",
      chart5: "rgb(200 130 210)",
    },
    light: {
      primary: "rgb(233 169 58)",
      primaryForeground: "rgb(26 20 8)",
      card: "rgb(255 255 255)",
      cardForeground: "rgb(28 25 20)",
      secondary: "rgb(236 232 224)",
      secondaryForeground: "rgb(28 25 20)",
      background: "rgb(245 243 239)",
      popover: "rgb(255 255 255)",
      popoverForeground: "rgb(28 25 20)",
      muted: "rgb(236 232 224)",
      mutedForeground: "rgb(106 98 86)",
      destructive: "rgb(196 43 43)",
      destructiveForeground: "rgb(255 255 255)",
      foreground: "rgb(28 25 20)",
      border: "rgb(228 223 213)",
      input: "rgb(228 223 213)",
      ring: "rgb(150 98 0)",
      accent: "rgb(150 98 0)",
      accentForeground: "rgb(255 255 255)",
      hero: "rgb(15 68 52)",
      heroForeground: "rgb(255 248 234)",
      heroMuted: "rgb(165 205 187)",
      onlineDot: "rgb(30 170 100)",
      batteryRing: "rgb(22 150 95)",
      dataRing: "rgb(196 128 12)",
      dataRingUpload: "rgb(15 110 80)",
      ringTrack: "rgb(236 232 224)",
      ringSuccess: "rgb(22 150 95)",
      ringWarning: "rgb(210 100 20)",
      ringDanger: "rgb(196 43 43)",
      chart1: "rgb(196 128 12)",
      chart2: "rgb(22 150 95)",
      chart3: "rgb(196 43 43)",
      chart4: "rgb(40 100 190)",
      chart5: "rgb(150 70 160)",
    },
  },
  harmattan: {
    name: "Harmattan dusk",
    weave: SHARED_WEAVE,
    dark: {
      primary: "rgb(255 178 63)",
      primaryForeground: "rgb(27 18 6)",
      card: "rgb(25 26 42)",
      cardForeground: "rgb(238 238 248)",
      secondary: "rgb(42 43 66)",
      secondaryForeground: "rgb(238 238 248)",
      background: "rgb(14 15 26)",
      popover: "rgb(25 26 42)",
      popoverForeground: "rgb(238 238 248)",
      muted: "rgb(42 43 66)",
      mutedForeground: "rgb(154 156 184)",
      destructive: "rgb(255 107 107)",
      destructiveForeground: "rgb(27 18 6)",
      foreground: "rgb(238 238 248)",
      border: "rgb(42 43 66)",
      input: "rgb(42 43 66)",
      ring: "rgb(255 186 82)",
      accent: "rgb(255 186 82)",
      accentForeground: "rgb(27 18 6)",
      hero: "rgb(43 38 117)",
      heroForeground: "rgb(255 255 255)",
      heroMuted: "rgb(189 184 242)",
      onlineDot: "rgb(91 227 169)",
      batteryRing: "rgb(91 227 169)",
      dataRing: "rgb(255 178 63)",
      dataRingUpload: "rgb(164 155 255)",
      ringTrack: "rgb(42 43 66)",
      ringSuccess: "rgb(91 227 169)",
      ringWarning: "rgb(255 140 60)",
      ringDanger: "rgb(255 107 107)",
      chart1: "rgb(255 178 63)",
      chart2: "rgb(164 155 255)",
      chart3: "rgb(91 227 169)",
      chart4: "rgb(255 143 199)",
      chart5: "rgb(120 200 255)",
    },
    light: {
      primary: "rgb(255 178 63)",
      primaryForeground: "rgb(27 18 6)",
      card: "rgb(255 255 255)",
      cardForeground: "rgb(22 22 40)",
      secondary: "rgb(233 233 244)",
      secondaryForeground: "rgb(22 22 40)",
      background: "rgb(244 244 250)",
      popover: "rgb(255 255 255)",
      popoverForeground: "rgb(22 22 40)",
      muted: "rgb(233 233 244)",
      mutedForeground: "rgb(96 98 124)",
      destructive: "rgb(205 45 45)",
      destructiveForeground: "rgb(255 255 255)",
      foreground: "rgb(22 22 40)",
      border: "rgb(224 224 238)",
      input: "rgb(224 224 238)",
      ring: "rgb(67 56 202)",
      accent: "rgb(67 56 202)",
      accentForeground: "rgb(255 255 255)",
      hero: "rgb(43 38 117)",
      heroForeground: "rgb(255 255 255)",
      heroMuted: "rgb(189 184 242)",
      onlineDot: "rgb(20 160 105)",
      batteryRing: "rgb(20 150 100)",
      dataRing: "rgb(214 140 20)",
      dataRingUpload: "rgb(99 88 230)",
      ringTrack: "rgb(233 233 244)",
      ringSuccess: "rgb(20 150 100)",
      ringWarning: "rgb(205 105 15)",
      ringDanger: "rgb(205 45 45)",
      chart1: "rgb(214 140 20)",
      chart2: "rgb(99 88 230)",
      chart3: "rgb(20 150 100)",
      chart4: "rgb(214 70 150)",
      chart5: "rgb(30 130 200)",
    },
  },
  cocoa: {
    name: "Cocoa pod",
    weave: SHARED_WEAVE,
    dark: {
      primary: "rgb(238 138 92)",
      primaryForeground: "rgb(28 13 6)",
      card: "rgb(24 32 30)",
      cardForeground: "rgb(234 242 239)",
      secondary: "rgb(39 51 49)",
      secondaryForeground: "rgb(234 242 239)",
      background: "rgb(14 19 18)",
      popover: "rgb(24 32 30)",
      popoverForeground: "rgb(234 242 239)",
      muted: "rgb(39 51 49)",
      mutedForeground: "rgb(147 166 160)",
      destructive: "rgb(245 100 100)",
      destructiveForeground: "rgb(28 13 6)",
      foreground: "rgb(234 242 239)",
      border: "rgb(39 51 49)",
      input: "rgb(39 51 49)",
      ring: "rgb(242 152 110)",
      accent: "rgb(242 152 110)",
      accentForeground: "rgb(28 13 6)",
      hero: "rgb(13 63 57)",
      heroForeground: "rgb(242 255 251)",
      heroMuted: "rgb(152 205 193)",
      onlineDot: "rgb(75 224 176)",
      batteryRing: "rgb(75 224 176)",
      dataRing: "rgb(238 138 92)",
      dataRingUpload: "rgb(246 201 176)",
      ringTrack: "rgb(39 51 49)",
      ringSuccess: "rgb(75 224 176)",
      ringWarning: "rgb(242 190 70)",
      ringDanger: "rgb(245 100 100)",
      chart1: "rgb(238 138 92)",
      chart2: "rgb(75 224 176)",
      chart3: "rgb(242 193 78)",
      chart4: "rgb(150 170 255)",
      chart5: "rgb(240 140 190)",
    },
    light: {
      primary: "rgb(238 138 92)",
      primaryForeground: "rgb(28 13 6)",
      card: "rgb(255 255 255)",
      cardForeground: "rgb(18 30 28)",
      secondary: "rgb(228 236 234)",
      secondaryForeground: "rgb(18 30 28)",
      background: "rgb(241 245 244)",
      popover: "rgb(255 255 255)",
      popoverForeground: "rgb(18 30 28)",
      muted: "rgb(228 236 234)",
      mutedForeground: "rgb(86 104 99)",
      destructive: "rgb(200 50 50)",
      destructiveForeground: "rgb(255 255 255)",
      foreground: "rgb(18 30 28)",
      border: "rgb(220 230 228)",
      input: "rgb(220 230 228)",
      ring: "rgb(176 74 30)",
      accent: "rgb(176 74 30)",
      accentForeground: "rgb(255 255 255)",
      hero: "rgb(13 63 57)",
      heroForeground: "rgb(242 255 251)",
      heroMuted: "rgb(152 205 193)",
      onlineDot: "rgb(15 160 120)",
      batteryRing: "rgb(15 150 115)",
      dataRing: "rgb(206 98 50)",
      dataRingUpload: "rgb(13 110 98)",
      ringTrack: "rgb(228 236 234)",
      ringSuccess: "rgb(15 150 115)",
      ringWarning: "rgb(190 120 0)",
      ringDanger: "rgb(200 50 50)",
      chart1: "rgb(206 98 50)",
      chart2: "rgb(15 150 115)",
      chart3: "rgb(190 120 0)",
      chart4: "rgb(70 90 200)",
      chart5: "rgb(190 60 130)",
    },
  },
  sobolo: {
    name: "Sobolo",
    weave: SHARED_WEAVE,
    dark: {
      primary: "rgb(124 92 245)",
      primaryForeground: "rgb(255 255 255)",
      card: "rgb(28 26 37)",
      cardForeground: "rgb(241 239 248)",
      secondary: "rgb(46 42 60)",
      secondaryForeground: "rgb(241 239 248)",
      background: "rgb(18 17 24)",
      popover: "rgb(28 26 37)",
      popoverForeground: "rgb(241 239 248)",
      muted: "rgb(46 42 60)",
      mutedForeground: "rgb(162 157 181)",
      destructive: "rgb(248 113 113)",
      destructiveForeground: "rgb(18 17 24)",
      foreground: "rgb(241 239 248)",
      border: "rgb(46 42 60)",
      input: "rgb(46 42 60)",
      ring: "rgb(176 156 255)",
      accent: "rgb(176 156 255)",
      accentForeground: "rgb(18 17 24)",
      hero: "rgb(42 28 85)",
      heroForeground: "rgb(255 255 255)",
      heroMuted: "rgb(198 185 244)",
      onlineDot: "rgb(91 227 169)",
      batteryRing: "rgb(91 227 169)",
      dataRing: "rgb(155 123 255)",
      dataRingUpload: "rgb(255 143 199)",
      ringTrack: "rgb(46 42 60)",
      ringSuccess: "rgb(91 227 169)",
      ringWarning: "rgb(251 191 36)",
      ringDanger: "rgb(248 113 113)",
      chart1: "rgb(155 123 255)",
      chart2: "rgb(91 227 169)",
      chart3: "rgb(255 143 199)",
      chart4: "rgb(251 191 36)",
      chart5: "rgb(120 200 255)",
    },
    light: {
      primary: "rgb(109 76 230)",
      primaryForeground: "rgb(255 255 255)",
      card: "rgb(255 255 255)",
      cardForeground: "rgb(24 20 40)",
      secondary: "rgb(234 231 245)",
      secondaryForeground: "rgb(24 20 40)",
      background: "rgb(245 244 250)",
      popover: "rgb(255 255 255)",
      popoverForeground: "rgb(24 20 40)",
      muted: "rgb(234 231 245)",
      mutedForeground: "rgb(98 92 120)",
      destructive: "rgb(210 45 45)",
      destructiveForeground: "rgb(255 255 255)",
      foreground: "rgb(24 20 40)",
      border: "rgb(225 221 240)",
      input: "rgb(225 221 240)",
      ring: "rgb(98 64 220)",
      accent: "rgb(98 64 220)",
      accentForeground: "rgb(255 255 255)",
      hero: "rgb(42 28 85)",
      heroForeground: "rgb(255 255 255)",
      heroMuted: "rgb(198 185 244)",
      onlineDot: "rgb(20 160 105)",
      batteryRing: "rgb(20 150 100)",
      dataRing: "rgb(124 92 245)",
      dataRingUpload: "rgb(214 70 150)",
      ringTrack: "rgb(234 231 245)",
      ringSuccess: "rgb(20 150 100)",
      ringWarning: "rgb(200 120 0)",
      ringDanger: "rgb(210 45 45)",
      chart1: "rgb(124 92 245)",
      chart2: "rgb(20 150 100)",
      chart3: "rgb(214 70 150)",
      chart4: "rgb(200 120 0)",
      chart5: "rgb(30 130 200)",
    },
  },
};

const toCssName = (key: string) =>
  `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d+)$/, "-$1")}`;

/** global.css holds bare channels (`--primary: 233 169 58`) for Tailwind's `rgb(var(--primary))`. */
export function cssVariables(tokens: ColorTokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [
      toCssName(key),
      value.slice(4, -1),
    ]),
  );
}
