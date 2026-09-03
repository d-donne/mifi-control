import { Tabs } from "expo-router";
import TabBar from "@/components/dashboard/TabBar";

/**
 * Tabs navigator for the four destinations:
 *   - index    (Home dashboard)
 *   - devices  (placeholder for now)
 *   - sms      (placeholder for now)
 *   - settings (credentials screen, moved from src/app/settings.tsx)
 *
 * Uses a custom floating-pill tab bar (components/dashboard/TabBar.tsx).
 * The default React Navigation tab bar is replaced via the `tabBar` prop.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="devices" options={{ title: "Devices" }} />
      <Tabs.Screen name="sms" options={{ title: "SMS" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
