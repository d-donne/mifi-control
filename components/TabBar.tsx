import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useDeviceNotifications } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import type { MaterialTopTabBarProps } from "expo-router/js-top-tabs";
import {
  Home,
  MessageCircle,
  Settings as SettingsIcon,
  TabletSmartphone,
  type LucideIcon,
} from "@/components/icons";
import { useState } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_META: Record<
  string,
  { Icon: LucideIcon; label: string } | undefined
> = {
  index: { Icon: Home, label: "Home" },
  devices: { Icon: TabletSmartphone, label: "Devices" },
  sms: { Icon: MessageCircle, label: "SMS" },
  settings: { Icon: SettingsIcon, label: "Settings" },
};

/** Bottom padding that keeps scrolling content clear of the floating bar. */
export function useTabBarClearance(): number {
  return useSafeAreaInsets().bottom + 90;
}

/**
 * Floating pill tab bar for the swipeable pager. The highlight follows the
 * pager's `position` while swiping, and each tab cross-fades between its
 * muted and active look by its distance from the current page.
 */
export default function TabBar({
  state,
  emitter,
  navigateToTab,
  position,
}: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const [width, setWidth] = useState(0);
  const unreadSms = useDeviceNotifications().data?.UnreadMessage ?? 0;

  const count = state.routes.length;
  const slot = count > 0 ? width / count : 0;
  const pages = state.routes.map((_, index) => index);
  const highlightX =
    count > 1
      ? position.interpolate({
          inputRange: pages,
          outputRange: pages.map((index) => index * slot),
        })
      : 0;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: insets.bottom + 10,
        left: 16,
        right: 16,
      }}
    >
      <View className="rounded-full bg-card/95 p-1.5">
        <View
          className="flex-row"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {slot > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: slot,
                borderRadius: 999,
                backgroundColor: colors.primary,
                transform: [{ translateX: highlightX }],
              }}
            />
          )}

          {state.routes.map((route, index) => {
            const meta = TAB_META[route.name];
            if (!meta) return <View key={route.key} className="flex-1" />;
            const { Icon, label } = meta;
            const focused = state.index === index;
            const active = position.interpolate({
              inputRange: [index - 1, index, index + 1],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            });
            const muted = Animated.subtract(1, active);
            const badge = route.name === "sms" ? unreadSms : 0;

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
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={
                  badge > 0 ? `${label}, ${badge} unread` : label
                }
                className="flex-1 items-center justify-center gap-0.5 py-2"
              >
                <View>
                  <Animated.View style={{ opacity: muted }}>
                    <Icon size={20} color={colors.mutedForeground} />
                  </Animated.View>
                  <Animated.View
                    style={{ position: "absolute", opacity: active }}
                  >
                    <Icon size={20} color={colors.primaryForeground} />
                  </Animated.View>
                  {badge > 0 && (
                    <View
                      className="absolute h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1"
                      style={{ top: -6, left: 12 }}
                    >
                      <Text className="text-[9px] leading-3 font-bold text-destructive-foreground">
                        {badge > 99 ? "99+" : badge}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Animated.View style={{ opacity: muted }}>
                    <Text className="text-[10px] font-medium text-muted-foreground">
                      {label}
                    </Text>
                  </Animated.View>
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      opacity: active,
                    }}
                  >
                    <Text className="text-center text-[10px] font-medium text-primary-foreground">
                      {label}
                    </Text>
                  </Animated.View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
