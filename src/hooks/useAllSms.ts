import { messageKey } from "@/components/sms/threads";
import type { SmsCount, SmsMessage } from "@/src/api/types/sms";
import {
  fetchAllSms,
  getMonitoring,
  getSmsConfig,
  getSmsCount,
  isDeliveryReport,
} from "@/src/api/routes";
import { BoxType, Smstat } from "@/src/api/types/sms";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import {
  applyOffsets,
  CONTINUOUS_POLL_MS,
  learnOffsets,
  loadOffsets,
} from "@/src/sms/clock";
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
  /** Delivery reports for sent messages, kept out of `messages`. */
  reports: SmsMessage[];
  inboxCount: number;
  sentCount: number;
  pages: number;
  /** Device slot counts from the same refresh; null until one succeeds. */
  storage: SmsCount | null;
  error: Error | null;
  deferred: boolean;
}

let lastFetch: {
  at: number;
  messages: SmsMessage[];
  complete: boolean;
} | null = null;

/**
 * The ONE SMS data hook. Fetches all inbox + all sent messages in a single
 * query (page loop runs to completion inside `fetchAllSms`), merges and
 * sorts ascending by corrected time. Both SmsList and ThreadView read this —
 * so the list and a tapped detail can never disagree about what exists.
 *
 * New messages are picked up by `useSmsHeartbeat`; the slow poll here is a
 * safety net, sped up while a multipart message is being reassembled or a
 * sent message is still pending.
 */
export function useAllSms() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();

  return useQuery<AllSms>({
    queryKey: ALL_SMS_QUERY_KEY,
    queryFn: async () => {
      // Sequential, not Promise.all: the device has one auth session and a
      // tiny CSRF token pool. Two concurrent page loops interleave
      // token rotation + re-login, and a re-login rotates the SessionID
      // cookie out from under the other loop — that race was the
      // intermittent "Device returned error" in the footer.
      await loadOffsets();
      const inbox = await fetchAllSms(client, BoxType.LOCAL_INBOX);
      const sent = await fetchAllSms(client, BoxType.LOCAL_SENT);
      const storage = await getSmsCount(client).catch(() => null);
      const received = [...inbox.messages, ...sent.messages];

      const fetchedAt = Date.now();
      const complete = !inbox.error && !sent.error;
      // Compared with the last fetch, not the cache: optimistic deletes and
      // read marks edit the cache.
      if (
        complete &&
        lastFetch?.complete &&
        fetchedAt - lastFetch.at < CONTINUOUS_POLL_MS
      ) {
        learnOffsets(lastFetch.messages, received, fetchedAt);
      }
      lastFetch = { at: fetchedAt, messages: received, complete };

      const all = applyOffsets(received).sort((a, b) => a.time - b.time);
      const messages = all.filter((m) => !isDeliveryReport(m));
      // The MiFi drops some delivery reports minutes after they arrive
      // (seen 2026-11-04); keep the ones already seen this session.
      const reports = all.filter(isDeliveryReport);
      const fetched = new Set(reports.map(messageKey));
      const previous = queryClient.getQueryData<AllSms>(ALL_SMS_QUERY_KEY);
      const earlier =
        previous?.reports.filter((r) => !fetched.has(messageKey(r))) ?? [];

      return {
        messages,
        reports: [...reports, ...earlier],
        inboxCount: messages.length - sent.messages.length,
        sentCount: sent.messages.length,
        pages: inbox.pages + sent.pages,
        storage: storage ?? previous?.storage ?? null,
        error: inbox.error ?? sent.error ?? null,
        deferred: inbox.deferred || sent.deferred,
      };
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const settling =
        data?.deferred ||
        data?.messages.some((m) => m.Smstat === Smstat.PENDING);
      return settling ? 10_000 : 60_000;
    },
    refetchIntervalInBackground: true,
    staleTime: 10_000,
  });
}

export function useSmsConfig() {
  return useHiLinkQuery({
    queryKey: ["sms", "config"],
    queryFn: getSmsConfig,
    staleTime: 5 * 60_000,
  });
}

export function useDeviceNotifications() {
  return useHiLinkQuery({
    queryKey: ["notifications"],
    queryFn: (client) => getMonitoring(client, "check-notifications"),
    refetchInterval: 5_000,
    // SmsNotifier needs it while the app is in the background.
    refetchIntervalInBackground: true,
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
