import { messageKey, normalizePhone } from "@/components/sms/threads";
import { isDeliveryReport, smsTime } from "@/src/api/routes";
import { Smstat, type SmsMessage } from "@/src/api/types/sms";
import * as SecureStore from "expo-secure-store";

// The MiFi drops the zone of each received stamp (it's the sending SMS
// centre's), so offsets are learned per sender from messages seen arriving.

const STORE_KEY = "mifi.smsOffsets";
const QUARTER_HOUR_MIN = 15;
const MAX_OFFSET_MIN = 14 * 60;
// A stamp precedes its arrival by delivery time; anything outside this window
// after rounding to a zone is a delayed message, not a measurement.
const RESIDUAL_MIN = { early: -2.5, late: 0.5 };
// Polls closer than this mean the app saw the message within that time of arrival.
export const CONTINUOUS_POLL_MS = 90_000;

type Offsets = Record<string, number>;

let learned: Offsets | null = null;

function parseOffsets(value: unknown): Offsets {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

export async function loadOffsets(): Promise<Offsets> {
  if (learned) return learned;
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    learned = raw ? parseOffsets(JSON.parse(raw)) : {};
  } catch {
    learned = {};
  }
  return learned;
}

function isReceived(m: SmsMessage): boolean {
  return m.Smstat === Smstat.NEW || m.Smstat === Smstat.READ;
}

/** Offset in minutes, if `stamp` read as UTC is a plausible zone shift of `arrivedAt`. */
export function measureOffset(stamp: string, arrivedAt: number): number | null {
  const stampUtc = smsTime(stamp, 0);
  if (!stampUtc) return null;
  const diffMin = (stampUtc - arrivedAt) / 60_000;
  const offset = Math.round(diffMin / QUARTER_HOUR_MIN) * QUARTER_HOUR_MIN;
  const residual = diffMin - offset;
  if (Math.abs(offset) > MAX_OFFSET_MIN) return null;
  if (residual < RESIDUAL_MIN.early || residual > RESIDUAL_MIN.late)
    return null;
  return offset;
}

/**
 * Learns offsets from received messages that weren't in the previous fetch.
 * Only call when that fetch was under CONTINUOUS_POLL_MS ago.
 */
export function learnOffsets(
  previous: SmsMessage[],
  current: SmsMessage[],
  fetchedAt: number,
): void {
  if (!learned) return;
  const known = new Set(previous.map(messageKey));
  let changed = false;
  for (const m of current) {
    if (!isReceived(m) || isDeliveryReport(m)) continue;
    if (known.has(messageKey(m))) continue;
    const offset = measureOffset(m.Date, fetchedAt);
    const key = normalizePhone(m.Phone);
    if (offset === null || !key || learned[key] === offset) continue;
    learned[key] = offset;
    changed = true;
  }
  if (changed) {
    void SecureStore.setItemAsync(STORE_KEY, JSON.stringify(learned)).catch(
      () => {},
    );
  }
}

/** Re-times received messages from senders with a learned offset. */
export function applyOffsets(messages: SmsMessage[]): SmsMessage[] {
  if (!learned || Object.keys(learned).length === 0) return messages;
  const offsets = learned;
  return messages.map((m) => {
    if (!isReceived(m) || isDeliveryReport(m)) return m;
    const offset = offsets[normalizePhone(m.Phone)];
    return offset === undefined ? m : { ...m, time: smsTime(m.Date, offset) };
  });
}
