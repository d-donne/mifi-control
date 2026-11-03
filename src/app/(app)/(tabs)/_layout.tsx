import TabBar from "@/components/TabBar";
import { TopTabs, type MaterialTopTabBarProps } from "expo-router/js-top-tabs";

const renderTabBar = (props: MaterialTopTabBarProps) => <TabBar {...props} />;

export default function TabsLayout() {
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={renderTabBar}
      screenOptions={{ lazy: true, lazyPreloadDistance: 1 }}
    >
      <TopTabs.Screen name="index" options={{ title: "Home" }} />
      <TopTabs.Screen name="devices" options={{ title: "Devices" }} />
      <TopTabs.Screen name="sms" options={{ title: "SMS" }} />
      <TopTabs.Screen name="settings" options={{ title: "Settings" }} />
    </TopTabs>
  );
}
