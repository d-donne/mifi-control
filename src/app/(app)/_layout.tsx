import { HiLinkProvider } from "@/src/hooks/HiLinkProvider";
import { useAppColors } from "@/src/hooks/useAppColors";
import { SmsNotifier } from "@/src/notifications/SmsNotifier";
import { Stack, type NativeStackNavigationOptions } from "expo-router";

export default function AppLayout() {
  const colors = useAppColors();
  const sheet: NativeStackNavigationOptions = {
    presentation: "formSheet",
    sheetAllowedDetents: "fitToContents",
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <HiLinkProvider>
      <SmsNotifier />
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="data-plan" options={sheet} />
        <Stack.Screen name="device/[mac]" options={sheet} />
        <Stack.Screen name="sms-settings" options={sheet} />
        <Stack.Screen name="signal" options={sheet} />
      </Stack>
    </HiLinkProvider>
  );
}
