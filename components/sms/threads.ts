import type { SmsMessage } from "@/src/api/types/sms";
import { str } from "@/src/api/utils";

export interface SmsThread {
  phone: string;
  normalizedPhone: string;
  lastMessage: SmsMessage;
  unreadCount: number;
  count: number;
}

/**
 * Grouping key for a sender/recipient.
 *
 * Digits-bearing values (real numbers): last-9-digits so one contact maps
 * to one thread across the device's formats — "+233241234567" /
 * "233241234567" / "0241234567" all key to "241234567".
 *
 * Alphanumeric sender IDs (telecom/bank names like "MTN", "ABSA"): have no
 * (or too few) digits — key by the raw string, lowercased. Collapsing them
 * to "" would merge every named sender into one phantom thread (this was
 * the "most contacts missing" bug). Short codes ("4040") keep their digits
 * and group naturally.
 */
function normalizePhone(raw: unknown): string {
  const s = str(raw).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length < 2) return s.toLowerCase(); // sender name or unusable
  return digits.length > 9 ? digits.slice(-9) : digits;
}

export function groupThreads(messages: SmsMessage[]): SmsThread[] {
  const map = new Map<string, SmsThread>();
  for (const m of messages) {
    const norm = normalizePhone(m.Phone ?? "");
    const existing = map.get(norm);
    if (!existing) {
      map.set(norm, {
        phone: m.Phone,
        normalizedPhone: norm,
        lastMessage: m,
        unreadCount: m.Smstat === 0 ? 1 : 0,
        count: 1,
      });
    } else {
      if (m.Date > existing.lastMessage.Date) existing.lastMessage = m;
      if (m.Smstat === 0) existing.unreadCount += 1;
      existing.count += 1;
    }
  }
  return [...map.values()].sort((a, b) =>
    b.lastMessage.Date.localeCompare(a.lastMessage.Date),
  );
}

export function filterThreads(threads: SmsThread[], query: string): SmsThread[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter(
    (t) =>
      (t.phone ?? "").toLowerCase().includes(q) ||
      (t.lastMessage.Content ?? "").toLowerCase().includes(q),
  );
}

/**
 * All messages of one contact, ascending by device date — the conversation
 * view. Reads from the SAME array the list groups (the useAllSms query),
 * so list and detail can never disagree about what exists.
 */
export function threadMessages(
  messages: SmsMessage[],
  phone: unknown,
): SmsMessage[] {
  return messages
    .filter((m) => phonesMatch(m.Phone, phone))
    .sort((a, b) => a.Date.localeCompare(b.Date));
}

export function phonesMatch(a: unknown, b: unknown): boolean {
  return normalizePhone(a) === normalizePhone(b);
}
