import type { SmsMessage } from "@/src/api/types/sms";
import { fetchAllSms, getMonitoring } from "@/src/api/routes";
import { BoxType } from "@/src/api/types/sms";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export const ALL_SMS_QUERY_KEY = ["sms", "all"] as const;

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
  error: Error | null;
  deferred: boolean;
}

/**
 * The ONE SMS data hook. Fetches all inbox + all sent messages in a single
 * query (page loop runs to completion inside `fetchAllSms`), merges and
 * sorts ascending by corrected time. Both SmsList and ThreadView read this —
 * so the list and a tapped detail can never disagree about what exists.
 *
 * New messages are picked up by `useSmsHeartbeat`; the slow poll here is a
 * safety net, sped up while a multipart message is still being reassembled.
 */
export function useAllSms() {
  const client = useHiLinkClient();

  return useQuery<AllSms>({
    queryKey: ALL_SMS_QUERY_KEY,
    queryFn: async () => {
      // Sequential, not Promise.all: the device has one auth session and a
      // tiny CSRF token pool. Two concurrent page loops interleave
      // token rotation + re-login, and a re-login rotates the SessionID
      // cookie out from under the other loop — that race was the
      // intermittent "Device returned error" in the footer.
      const inbox = await fetchAllSms(client, BoxType.LOCAL_INBOX);
      const sent = await fetchAllSms(client, BoxType.LOCAL_SENT);

      const messages = [...inbox.messages, ...sent.messages].sort(
        (a, b) => a.time - b.time,
      );

      return {
        messages,
        inboxCount: inbox.messages.length,
        sentCount: sent.messages.length,
        pages: inbox.pages + sent.pages,
        error: inbox.error ?? sent.error ?? null,
        deferred: inbox.deferred || sent.deferred,
      };
    },
    refetchInterval: (query) => (query.state.data?.deferred ? 10_000 : 60_000),
    staleTime: 10_000,
  });
}

export function useDeviceNotifications() {
  return useHiLinkQuery({
    queryKey: ["notifications"],
    queryFn: (client) => getMonitoring(client, "check-notifications"),
    refetchInterval: 5_000,
  });
}

/** Refetches the SMS list whenever the device's unread count changes. */
export function useSmsHeartbeat() {
  const queryClient = useQueryClient();
  const unread = useDeviceNotifications().data?.UnreadMessage;
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (unread === undefined) return;
    if (previous.current !== undefined && unread !== previous.current) {
      // Never restart a fetch in flight: two page loops would fight over the
      // device's single session.
      void queryClient.invalidateQueries(
        { queryKey: ALL_SMS_QUERY_KEY },
        { cancelRefetch: false },
      );
    }
    previous.current = unread;
  }, [unread, queryClient]);
}
