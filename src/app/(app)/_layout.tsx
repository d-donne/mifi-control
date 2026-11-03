import { HiLinkProvider } from "@/src/hooks/HiLinkProvider";
import { useAppColors } from "@/src/hooks/useAppColors";
import { SmsNotifier } from "@/src/notifications/SmsNotifier";
import { Stack } from "expo-router";

export default function AppLayout() {
  const colors = useAppColors();

  return (
    <HiLinkProvider>
      <SmsNotifier />
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen
          name="data-plan"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.75, 1],
            sheetInitialDetentIndex: 0,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack>
    </HiLinkProvider>
  );
}
