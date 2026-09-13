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
  SortType as SortTypeValues,
} from "../types/sms";

function toNumber(v: string | number | unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Format a Date as naive-local "YYYY-MM-DD HH:MM:SS" for the device. */
export function formatDeviceDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function normalizeSmsMessage(raw: RawSmsMessage): SmsMessage {
  const { Index, Smstat, SaveType, Priority, SmsType, ...rest } = raw;
  return {
    ...rest,
    Index: toNumber(Index),
    Smstat: toNumber(Smstat),
    Phone: raw.Phone ?? "",
    Content: raw.Content ?? "",
    Date: raw.Date ?? "",
    Sca: raw.Sca ?? "",
    SaveType: toNumber(SaveType),
    Priority: toNumber(Priority),
    SmsType: toNumber(SmsType),
  };
}

export function normalizeSmsListResponse(
  raw: RawSmsListResponse,
): SmsListResponse {
  const msg = raw.Messages?.Message;
  const list = msg === undefined ? [] : Array.isArray(msg) ? msg : [msg];
  return {
    Count: toNumber(raw.Count),
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

/**
 * Device datetime "YYYY-MM-DD HH:MM:SS" (naive device-local) → epoch ms.
 * Non-parseable dates → NaN (caller decides).
 */
function deviceDateToMs(date: string): number {
  return new Date(date.replace(" ", "T")).getTime();
}

export interface FetchAllSmsResult {
  messages: SmsMessage[];
  /** Pages actually fetched (for diagnostics). */
  pages: number;
  /** If a mid-loop page failed, the error that stopped it (non-fatal). */
  error: unknown | null;
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
  let lastError: unknown | null = null;

  for (let page = 1; page <= maxPages; page++) {
    let res: SmsListResponse;
    try {
      res = await getSmsList(client, page, pageSize, boxType);
    } catch (e) {
      lastError = e;
      break;
    }
    pages++;
    if (res.Messages.length === 0) break;

    // Multipart age guard (Salamek: skip MULTIPART messages < 10s old so
    // the device has time to reassemble parts; younger ones come back
    // with empty Content).
    const now = Date.now();
    for (const m of res.Messages) {
      if (m.SmsType === SmsTypeValues.MULTIPART) {
        const t = deviceDateToMs(m.Date);
        if (Number.isFinite(t) && now - t < 10_000) continue;
      }
      messages.push(m);
    }

    if (res.Messages.length < pageSize) break; // last, partial page
  }

  return { messages, pages, error: lastError };
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
