import { groupThreads, messageKey } from "@/components/sms/threads";
import { useAllSms, useSmsHeartbeat } from "@/src/hooks/useAllSms";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ensureSmsPermissions,
  initSmsNotifications,
  notifyThread,
} from "./sms";

export function SmsNotifier() {
  const router = useRouter();
  const all = useAllSms();
  useSmsHeartbeat();
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    initSmsNotifications();
    ensureSmsPermissions().catch(() => false);
  }, []);

  useEffect(() => {
    const data = all.data;
    if (!data) return;
    if (seenRef.current === null) {
      // A partial first fetch would leave older unread messages unseen and
      // notify them once the rest loads.
      if (data.error) return;
      seenRef.current = new Set(data.messages.map(messageKey));
      return;
    }
    const seen = seenRef.current;
    const fresh = data.messages.filter(
      (m) => m.Smstat === 0 && !seen.has(messageKey(m)),
    );
    for (const m of data.messages) seen.add(messageKey(m));
    if (fresh.length === 0) return;

    for (const thread of [...groupThreads(fresh)].reverse()) {
      void notifyThread(
        thread.phone,
        thread.count,
        thread.lastMessage.Content,
      ).catch(() => {});
    }
  }, [all.data]);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const phone = response.notification.request.content.data?.phone;
    // Cleared so a remount (sign out and back in) doesn't reopen it.
    Notifications.clearLastNotificationResponse();
    if (typeof phone === "string" && phone.length > 0) {
      router.push({ pathname: "/conversation/[phone]", params: { phone } });
    }
  }, [response, router]);

  return null;
}
