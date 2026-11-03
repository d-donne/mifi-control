import { HiLinkProvider } from "@/src/hooks/HiLinkProvider";
import { SmsNotifier } from "@/src/notifications/SmsNotifier";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <HiLinkProvider>
      <SmsNotifier />
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      />
    </HiLinkProvider>
  );
}
