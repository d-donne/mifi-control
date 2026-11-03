import { displayName, isUnnamed } from "@/components/devices/hostDisplay";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { LanHost } from "@/src/api/types";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useLanHosts } from "@/src/hooks/useLanHosts";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

const MAX_AVATARS = 3;
const AVATAR_SIZE = 36;

function initials(host: LanHost): string {
  if (isUnnamed(host)) return "?";
  const words = displayName(host)
    .split(/[\s_-]+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function summary(hosts: LanHost[]): string {
  const names = hosts.map((h) =>
    h.isLocalDevice === 1 ? "This phone" : displayName(h),
  );
  if (names.length === 0) return "Nothing on the Wi-Fi right now";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const others = names.length - 1;
  return `${names[0]} and ${others} others`;
}

export default function DevicesSummaryCard() {
  const colors = useAppColors();
  const router = useRouter();
  const { data } = useLanHosts();
  const connected = (data ?? [])
    .filter((h) => h.Active === 1)
    .sort((a, b) => b.isLocalDevice - a.isLocalDevice);
  const palette = [colors.chart1, colors.chart4, colors.chart2, colors.chart5];
  const extra = connected.length - MAX_AVATARS;

  return (
    <Pressable
      onPress={() => router.navigate("/devices")}
      accessibilityRole="button"
      accessibilityLabel={`${connected.length} devices connected. Open devices`}
      className="flex-row items-center gap-4 rounded-2xl bg-card p-4"
    >
      <View className="flex-row">
        {connected.slice(0, MAX_AVATARS).map((host, i) => (
          <View
            key={host.ID}
            className="items-center justify-center rounded-full border-2 border-card"
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              marginLeft: i === 0 ? 0 : -12,
              backgroundColor: palette[i % palette.length],
            }}
          >
            <Text className="text-xs font-bold text-background">
              {initials(host)}
            </Text>
          </View>
        ))}
        {extra > 0 && (
          <View
            className="items-center justify-center rounded-full border-2 border-card bg-background"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, marginLeft: -12 }}
          >
            <Text className="text-xs font-semibold text-muted-foreground">
              +{extra}
            </Text>
          </View>
        )}
      </View>
      <VStack className="flex-1">
        <Text className="font-semibold text-foreground">
          {data
            ? `${connected.length} ${connected.length === 1 ? "device" : "devices"} connected`
            : "Checking devices…"}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {data ? summary(connected) : " "}
        </Text>
      </VStack>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}
