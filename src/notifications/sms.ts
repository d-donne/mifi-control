import * as Notifications from "expo-notifications";

export const SMS_CHANNEL_ID = "sms";

let handlerSet = false;

export function initSmsNotifications(): void {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let permissionsInFlight: Promise<boolean> | null = null;

export function ensureSmsPermissions(): Promise<boolean> {
  if (!permissionsInFlight) {
    permissionsInFlight = (async () => {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(SMS_CHANNEL_ID, {
        name: "SMS",
        importance: Notifications.AndroidImportance.HIGH,
      });
      const { granted } = await Notifications.requestPermissionsAsync();
      return granted;
    })().catch(() => false);
  }
  return permissionsInFlight;
}

export function notifyThread(
  phone: string,
  count: number,
  preview: string,
): Promise<string> {
  const snippet = preview.trim().slice(0, 160);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: phone,
      body:
        count > 1
          ? `${count} new messages: ${snippet || "(new message)"}`
          : snippet || "(new message)",
      data: { phone },
    },
    trigger: { channelId: SMS_CHANNEL_ID },
  });
}
