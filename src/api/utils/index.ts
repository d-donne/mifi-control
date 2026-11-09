export * from "./date";
export * from "./crypto";
export * from "./mcc";
export * from "./network";
export * from "./xhr";

/**
 * Boundary coercion helpers.
 *
 * The XML parser is configured with `parseTagValue: false`, so every tag
 * arrives as a string (the wire truth). Each route module coerces its own
 * numeric fields explicitly with `num` — the single place where "wire
 * string" becomes a typed JS value. String fields need no coercion.
 *
 * Matches Salamek's `Message.from_dict` pattern: parse at the boundary,
 * trust the type afterwards.
 */

/** Coerce a wire value to number. Falls back on non-numeric input. */
export function num(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce a wire value to a 0|1 flag. Non-"1" input is 0. */
export function flag(v: unknown): 0 | 1 {
  return num(v) === 1 ? 1 : 0;
}

/** Coerce a wire value to string (anything but string/number/boolean → ""). */
export function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decodes HTML character references left in device text — SMS content
 * arrives with "/" as "&#x2F;" (the web UI decodes these itself).
 * Single pass, so already-decoded text is left alone.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref.startsWith("#")) {
      const hex = ref[1] === "x" || ref[1] === "X";
      const code = Number.parseInt(ref.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? match;
  });
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
