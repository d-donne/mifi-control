import { groupThreads } from "@/components/sms/threads";
import { useAllSms } from "@/src/hooks/useAllSms";
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
  const seenRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    initSmsNotifications();
    ensureSmsPermissions().catch(() => false);
  }, []);

  useEffect(() => {
    const messages = all.data?.messages;
    if (!messages) return;
    if (seenRef.current === null) {
      seenRef.current = new Set(messages.map((m) => m.Index));
      return;
    }
    const seen = seenRef.current;
    const fresh = messages.filter((m) => m.Smstat === 0 && !seen.has(m.Index));
    seenRef.current = new Set(messages.map((m) => m.Index));
    if (fresh.length === 0) return;

    for (const thread of [...groupThreads(fresh)].reverse()) {
      void notifyThread(
        thread.phone,
        thread.count,
        thread.lastMessage.Content,
      ).catch(() => {});
    }
  }, [all.data]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const phone = response.notification.request.content.data?.phone;
        if (typeof phone === "string" && phone.length > 0) {
          router.push({ pathname: "/sms/[phone]", params: { phone } });
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  return null;
}
