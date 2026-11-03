import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import {
  Home,
  LucideIcon,
  MessageCircle,
  Settings as SettingsIcon,
  TabletSmartphone,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center } from "./ui/center";
import { useAppColors } from "@/src/hooks/useAppColors";

const TAB_META: Record<
  string,
  { Icon: LucideIcon; label: string } | undefined
> = {
  index: { Icon: Home, label: "Home" },
  devices: { Icon: TabletSmartphone, label: "Devices" },
  sms: { Icon: MessageCircle, label: "SMS" },
  settings: { Icon: SettingsIcon, label: "Settings" },
};

export default function TabBar({
  state,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();

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
      <Center className="flex-row bg-card/95 p-2" style={{ borderRadius: 100 }}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const { Icon, label } = meta;
          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigateToTab(route.key);
                }
              }}
              className="flex-1 items-center justify-center"
              hitSlop={8}
            >
              <Box
                className={
                  focused
                    ? "flex-row items-center justify-center gap-2 bg-primary px-4 py-2"
                    : "flex-row items-center justify-center gap-2 px-4 py-2"
                }
                style={focused ? { borderRadius: 100 } : undefined}
              >
                <Icon
                  size={20}
                  color={
                    focused ? colors.primaryForeground : colors.mutedForeground
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
