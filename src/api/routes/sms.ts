import type { HiLinkClient } from "../main";
import type {
  BoxType,
  RawSmsMessage,
  RawSmsListResponse,
  SmsCountResponse,
  SmsListResponse,
  SmsMessage,
  SortType,
} from "../types/sms";
import {
  BoxType as BoxTypeValues,
  SmsType as SmsTypeValues,
  Smstat as SmstatValues,
  SortType as SortTypeValues,
} from "../types/sms";
import { decodeHtmlEntities, num } from "../utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a Date as naive-local "YYYY-MM-DD HH:MM:SS" for the device. */
export function formatDeviceDate(d: Date = new Date()): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// A received stamp is the sending SMS centre's wall clock with its zone
// dropped. MTN's centre (this SIM's network, also used by MoMo, banks and
// delivery reports) stamps UTC+5:30; other Ghanaian networks stamp UTC+0
// (measured 2026-11-03/04, p-docs/sms-research.md).
const MTN_STAMP_OFFSET_MIN = 330;
const MTN_GH_CODES = new Set(["24", "25", "53", "54", "55", "59"]);

export function defaultOffsetMin(phone: string, smsType: number): number {
  // Delivery reports come from this SIM's own (MTN) centre.
  if (
    smsType === SmsTypeValues.DELIVERY_SUCCESS ||
    smsType === SmsTypeValues.DELIVERY_FAILURE
  ) {
    return MTN_STAMP_OFFSET_MIN;
  }
  const digits = phone.replace(/[\s-]/g, "");
  const ghana = /^(?:\+?233|0)(\d{9})$/.exec(digits);
  if (ghana) {
    return MTN_GH_CODES.has(ghana[1]?.slice(0, 2) ?? "")
      ? MTN_STAMP_OFFSET_MIN
      : 0;
  }
  // Foreign numbers: the sending centre's zone is unknown.
  if (/^\+?\d{10,15}$/.test(digits)) return 0;
  // Sender names and short codes go through MTN.
  return MTN_STAMP_OFFSET_MIN;
}

const DEVICE_DATE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** `offsetMin` null: the stamp is the phone's local time (sent messages). */
export function smsTime(date: string, offsetMin: number | null): number {
  const match = DEVICE_DATE.exec(date);
  if (!match) return 0;
  const [year, month, day, hours, minutes, seconds] = match
    .slice(1)
    .map(Number) as [number, number, number, number, number, number];
  return offsetMin === null
    ? new Date(year, month - 1, day, hours, minutes, seconds).getTime()
    : Date.UTC(year, month - 1, day, hours, minutes - offsetMin, seconds);
}

export function normalizeSmsMessage(raw: RawSmsMessage): SmsMessage {
  const { Index, Smstat, SaveType, Priority, SmsType, ...rest } = raw;
  const smstat = num(Smstat);
  const date = raw.Date ?? "";
  const received = smstat === SmstatValues.NEW || smstat === SmstatValues.READ;
  const phone = decodeHtmlEntities(raw.Phone ?? "");
  const smsType = num(SmsType);
  return {
    ...rest,
    Index: num(Index),
    Smstat: smstat,
    Phone: phone,
    Content: decodeHtmlEntities(raw.Content ?? ""),
    Date: date,
    time: smsTime(date, received ? defaultOffsetMin(phone, smsType) : null),
    Sca: raw.Sca ?? "",
    SaveType: num(SaveType),
    Priority: num(Priority),
    SmsType: smsType,
  };
}

export function isDeliveryReport(message: SmsMessage): boolean {
  return (
    message.SmsType === SmsTypeValues.DELIVERY_SUCCESS ||
    message.SmsType === SmsTypeValues.DELIVERY_FAILURE
  );
}

export function normalizeSmsListResponse(
  raw: RawSmsListResponse,
): SmsListResponse {
  const msg = raw.Messages?.Message;
  const list = msg === undefined ? [] : Array.isArray(msg) ? msg : [msg];
  return {
    Count: num(raw.Count),
    Messages: list.map(normalizeSmsMessage),
  };
}

/**
 * Field order is significant here — the device rejects reordered bodies.
 * Keep PageIndex → ReadCount → BoxType → SortType → Ascending → UnreadPreferred.
 */
export async function getSmsList(
  client: HiLinkClient,
  page: number = 1,
  readCount: number = 20,
  boxType: BoxType = BoxTypeValues.LOCAL_INBOX,
  sortType: SortType = SortTypeValues.DATE,
  ascending: number = 0,
  unreadPreferred: number = 0,
): Promise<SmsListResponse> {
  const bodyObj: Record<string, unknown> = {
    PageIndex: page,
    ReadCount: readCount,
    BoxType: boxType,
    SortType: sortType,
    Ascending: ascending,
    UnreadPreferred: unreadPreferred,
  };
  const res = await client.requestAs<{ response: RawSmsListResponse }>(
    "/api/sms/sms-list",
    { method: "POST", bodyObj },
  );
  return normalizeSmsListResponse(res.response);
}

export interface FetchAllSmsResult {
  messages: SmsMessage[];
  /** Pages actually fetched (for diagnostics). */
  pages: number;
  /** If a mid-loop page failed, the error that stopped it (non-fatal). */
  error: Error | null;
  /** A multipart message was skipped while the device reassembles it. */
  deferred: boolean;
}

/**
 * Fetch every message in a box, paging until the device returns an empty
 * page. This mirrors Salamek's `get_messages()` loop: the reference never
 * trusts the response `Count` for pagination (its semantics — per-page,
 * remaining, or global — are undocumented), it only stops on an empty
 * page. Do the same; a mid-loop failure returns what was fetched with the
 * error attached instead of throwing.
 */
export async function fetchAllSms(
  client: HiLinkClient,
  boxType: BoxType,
  pageSize = 50,
  maxPages = 200,
): Promise<FetchAllSmsResult> {
  const messages: SmsMessage[] = [];
  let pages = 0;
  let lastError: Error | null = null;
  let deferred = false;

  for (let page = 1; page <= maxPages; page++) {
    let res: SmsListResponse;
    try {
      res = await getSmsList(client, page, pageSize, boxType);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      break;
    }
    pages++;
    if (res.Messages.length === 0) break;

    // Multipart age guard (Salamek: skip MULTIPART messages < 10s old so
    // the device has time to reassemble parts; younger ones come back
    // with empty Content).
    const now = Date.now();
    for (const m of res.Messages) {
      if (
        m.SmsType === SmsTypeValues.MULTIPART &&
        m.time &&
        now - m.time < 10_000
      ) {
        deferred = true;
        continue;
      }
      messages.push(m);
    }

    if (res.Messages.length < pageSize) break; // last, partial page
  }

  return { messages, pages, error: lastError, deferred };
}

export async function getSmsCount(
  client: HiLinkClient,
): Promise<SmsCountResponse> {
  const res = await client.requestAs<{ response: SmsCountResponse }>(
    "/api/sms/sms-count",
  );
  return res.response;
}

export async function setSmsRead(
  client: HiLinkClient,
  index: number,
): Promise<void> {
  await client.requestAs("/api/sms/set-read", {
    method: "POST",
    bodyObj: { Index: index },
  });
}

export async function deleteSms(
  client: HiLinkClient,
  index: number,
): Promise<void> {
  await client.requestAs("/api/sms/delete-sms", {
    method: "POST",
    bodyObj: { Index: index },
  });
}

export async function sendSms(
  client: HiLinkClient,
  phones: string[],
  message: string,
): Promise<void> {
  const bodyObj: Record<string, unknown> = {
    Index: -1,
    Phones: { Phone: phones },
    Sca: "",
    Content: message,
    Length: message.length,
    Reserved: 1,
    Date: formatDeviceDate(new Date()),
  };
  await client.requestAs("/api/sms/send-sms", {
    method: "POST",
    bodyObj,
  });
}
