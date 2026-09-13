import type { SmsMessage } from "@/src/api/types/sms";
import { fetchAllSms } from "@/src/api/routes";
import { BoxType } from "@/src/api/types/sms";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useQuery } from "@tanstack/react-query";

/**
 * Shape of the single SMS query. `error` carries a *partial* failure: the
 * loop in `fetchAllSms` returns what it fetched and attaches the error
 * that stopped it, so the UI can render partial data plus a warning
 * instead of replacing the screen.
 */
export interface AllSms {
  messages: SmsMessage[];
  inboxCount: number;
  sentCount: number;
  pages: number;
  error: unknown | null;
}

/**
 * The ONE SMS data hook. Fetches all inbox + all sent messages in a single
 * query (page loop runs to completion inside `fetchAllSms`), merges and
 * sorts ascending by device date. Both SmsList and ThreadView read this —
 * so the list and a tapped detail can never disagree about what exists.
 *
 * SMS volume on the device is small (storage-capped); polling the full set
 * every 30s is cheap on local Wi-Fi and keeps new messages appearing
 * without manual refresh.
 */
export function useAllSms() {
  const client = useHiLinkClient();

  return useQuery<AllSms>({
    queryKey: ["sms", "all"],
    queryFn: async () => {
      // Sequential, not Promise.all: the device has one auth session and a
      // tiny CSRF token pool. Two concurrent page loops interleave
      // token rotation + re-login, and a re-login rotates the SessionID
      // cookie out from under the other loop — that race was the
      // intermittent "Device returned error" in the footer.
      const inbox = await fetchAllSms(client, BoxType.LOCAL_INBOX);
      const sent = await fetchAllSms(client, BoxType.LOCAL_SENT);

      const messages = [...inbox.messages, ...sent.messages].sort((a, b) =>
        a.Date.localeCompare(b.Date),
      );

      return {
        messages,
        inboxCount: inbox.messages.length,
        sentCount: sent.messages.length,
        pages: inbox.pages + sent.pages,
        error: inbox.error ?? sent.error ?? null,
      };
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}