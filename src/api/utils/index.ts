export * from "./date";
export * from "./crypto";
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

/** Coerce a wire value to string (undefined/null → ""). */
export function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}