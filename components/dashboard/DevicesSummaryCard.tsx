import { Box } from "@/components/ui/box";
import { displayName, isUnnamed } from "@/components/devices/hostDisplay";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { LanHost } from "@/src/api/types";
import { useAppColors, withAlpha } from "@/src/hooks/useAppColors";
import { useLanHosts } from "@/src/hooks/useLanHosts";
import { useRouter } from "expo-router";
import { ChevronRight } from "@/components/icons";

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

function summary(connected: LanHost[]): string {
  if (connected.length === 0) return "Nothing is on the Wi-Fi";
  const first = displayName(connected[0]);
  const others = connected.length - 1;
  if (others === 0) return first;
  return `${first} and ${others} other${others === 1 ? "" : "s"}`;
}

export default function DevicesSummaryCard() {
  const colors = useAppColors();
  const router = useRouter();
  const { data } = useLanHosts();
  const connected = (data ?? [])
    .filter((h) => h.Active === 1)
    .sort((a, b) => b.isLocalDevice - a.isLocalDevice);
  const palette = [colors.chart1, colors.chart2, colors.chart3, colors.chart4];
  const extra = connected.length - MAX_AVATARS;
  const title = !data
    ? "Devices"
    : `${connected.length} ${connected.length === 1 ? "device" : "devices"} connected`;

  return (
    <Pressable
      onPress={() => router.navigate("/devices")}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Open devices`}
      className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3.5 data-[active=true]:opacity-80"
    >
      {connected.length > 0 && (
        <HStack className="items-center">
          {connected.slice(0, MAX_AVATARS).map((host, i) => {
            const tint = palette[i % palette.length];
            return (
              <Box
                key={host.ID}
                className="rounded-full bg-card p-0.5"
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  marginLeft: i === 0 ? 0 : -10,
                }}
              >
                <Box
                  className="flex-1 items-center justify-center rounded-full"
                  style={{ backgroundColor: withAlpha(tint, 0.22) }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: tint }}
                  >
                    {initials(host)}
                  </Text>
                </Box>
              </Box>
            );
          })}
          {extra > 0 && (
            <Box
              className="items-center justify-center rounded-full border-2 border-card bg-muted"
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                marginLeft: -10,
              }}
            >
              <Text className="text-[11px] font-bold text-foreground">
                +{extra}
              </Text>
            </Box>
          )}
        </HStack>
      )}
      <VStack className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        {data && (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {summary(connected)}
          </Text>
        )}
      </VStack>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}
