import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import {
  Home,
  LucideIcon,
  MessageCircle,
  Settings as SettingsIcon,
  TabletSmartphone
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center } from "../ui/center";

/**
 * Custom floating-pill tab bar for the home/dashboard tabs.
 *
 * Visual:
 *  - Floating pill at the bottom of the screen with side margins.
 *  - 4 items: Home, Devices, SMS, Settings.
 *  - Active item: filled --primary pill behind icon + label, with
 *    --primary-foreground (white) on both icon and text. The filled pill is
 *    what makes the active state visually pop.
 *  - Inactive items: muted-foreground icon (no label). In dark mode the
 *    muted-foreground token is bumped lighter than usual so the inactive icons
 *    stay clearly readable on the dark bar.
 *  - Inactive items: muted-foreground icon, no label.
 *  - Bar background uses bg-card, sits above the screen background (bg-background)
 *    for two-tier surface hierarchy per the dashboard spec.
 */

type RouteName = "index" | "devices" | "sms" | "settings";

const TAB_META: Record<RouteName, { Icon: LucideIcon; label: string }> = {
  index: { Icon: Home, label: "Home" },
  devices: { Icon: TabletSmartphone, label: "Devices" },
  sms: { Icon: MessageCircle, label: "SMS" },
  settings: { Icon: SettingsIcon, label: "Settings" },
};

export default function TabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Box
      style={{
        position: "absolute",
        bottom: insets.bottom + 10,
        left: 16,
        right: 16,
      }}
      className="pointer-events-box-none"
    >
      <Center
        className="bg-card/95 flex-row p-2"
        style={{ borderRadius: 100 }}
      >
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name as RouteName];
          if (!meta) return null;
          const { Icon, label } = meta;
          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              className="flex-1 items-center justify-center"
              hitSlop={8}
            >
              <Box
                className={
                  focused
                    ? "bg-primary flex-row items-center justify-center px-4 py-2 gap-2"
                    : "flex-row items-center justify-center px-4 py-2 gap-2"
                }
                style={focused ? { borderRadius: 100 } : undefined}
              >
                <Icon
                  size={20}
                  className={
                    focused
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }
                />
                {focused && (
                  <Text className="text-xs font-semibold text-primary-foreground">
                    {label}
                  </Text>
                )}
              </Box>
            </Pressable>
          );
        })}
      </Center>
    </Box>
  );
}
