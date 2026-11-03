import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { getMonitoring, splitHostAddresses } from "@/src/api/routes";
import type { LanHost } from "@/src/api/types";
import { formatDuration } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useLanHosts } from "@/src/hooks/useLanHosts";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import {
  byDisplayName,
  displayName,
  isUnnamed,
  DeviceIcon,
} from "./hostDisplay";

function CapacityCard({
  connected,
  limit,
}: {
  connected: number;
  limit: number | undefined;
}) {
  const colors = useAppColors();
  const ratio = limit ? Math.min(connected / limit, 1) : 0;

  return (
    <VStack space="sm" className="rounded-3xl bg-card p-5">
      <HStack className="items-baseline justify-between">
        <HStack space="xs" className="items-baseline">
          <Text className="text-3xl font-bold text-foreground">
            {connected}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {limit ? `of ${limit} connected` : "connected"}
          </Text>
        </HStack>
        {limit !== undefined && (
          <Text className="text-xs text-muted-foreground">
            {Math.max(limit - connected, 0)} free
          </Text>
        )}
      </HStack>
      <View
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: colors.dataRingTrack }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: colors.primary }}
        />
      </View>
    </VStack>
  );
}

function HostRow({ host }: { host: LanHost }) {
  const colors = useAppColors();
  const router = useRouter();
  const { ipv4 } = splitHostAddresses(host.IpAddress);
  const connected = host.Active === 1;
  const details = [
    isUnnamed(host) ? host.MacAddress : ipv4,
    connected && host.AssociatedTime > 0
      ? formatDuration(host.AssociatedTime)
      : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/device/[mac]",
          params: { mac: host.MacAddress },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${displayName(host)}, ${connected ? "connected" : "not connected"}`}
      className="flex-row items-center gap-3 py-3"
    >
      <View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
          <DeviceIcon
            host={host}
            size={20}
            color={connected ? colors.primary : colors.mutedForeground}
          />
        </View>
        {connected && (
          <View
            className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-card"
            style={{ backgroundColor: colors.onlineDot }}
          />
        )}
      </View>
      <VStack className="flex-1">
        <HStack space="sm" className="items-center">
          <Text
            className={
              connected
                ? "shrink font-semibold text-foreground"
                : "shrink text-foreground"
            }
            numberOfLines={1}
          >
            {displayName(host)}
          </Text>
          {host.isLocalDevice === 1 && (
            <Text className="rounded-full bg-primary/15 px-2 text-[10px] text-primary">
              This phone
            </Text>
          )}
        </HStack>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {details.length > 0 ? details.join(" · ") : host.MacAddress}
        </Text>
      </VStack>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function DeviceList() {
  const colors = useAppColors();
  const [showPrevious, setShowPrevious] = useState(false);

  const hosts = useLanHosts();
  const { data: status } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8000,
  });

  const all = hosts.data ?? [];
  const connected = all
    .filter((h) => h.Active === 1)
    .sort((a, b) => b.isLocalDevice - a.isLocalDevice || byDisplayName(a, b));
  const previous = all.filter((h) => h.Active === 0).sort(byDisplayName);

  return (
    <ScrollView
      contentContainerClassName="px-4 pt-2 pb-28"
      refreshControl={
        <RefreshControl
          refreshing={hosts.isRefetching}
          onRefresh={() => void hosts.refetch()}
        />
      }
    >
      <VStack space="lg">
        <Heading size="2xl">Devices</Heading>

        {hosts.isPending ? (
          <VStack space="sm" className="rounded-3xl bg-card p-5">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </VStack>
        ) : hosts.error && all.length === 0 ? (
          <VStack space="md" className="rounded-3xl bg-card p-5">
            <Text className="text-sm text-destructive">
              Couldn&apos;t load devices: {hosts.error.message}
            </Text>
            <Button variant="outline" onPress={() => void hosts.refetch()}>
              <ButtonText>Retry</ButtonText>
            </Button>
          </VStack>
        ) : (
          <>
            <CapacityCard
              connected={connected.length}
              limit={status?.TotalWifiUser}
            />

            <VStack space="xs">
              <Text className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Connected now
              </Text>
              <VStack className="rounded-3xl bg-card px-4 py-1">
                {connected.length === 0 ? (
                  <Text className="py-4 text-sm text-muted-foreground">
                    No devices connected right now.
                  </Text>
                ) : (
                  connected.map((host) => <HostRow key={host.ID} host={host} />)
                )}
              </VStack>
            </VStack>

            {previous.length > 0 && (
              <VStack className="rounded-3xl bg-card px-4 py-1">
                <Pressable
                  onPress={() => setShowPrevious((v) => !v)}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-sm text-muted-foreground">
                    Previously connected ({previous.length})
                  </Text>
                  {showPrevious ? (
                    <ChevronUp size={18} color={colors.mutedForeground} />
                  ) : (
                    <ChevronDown size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
                {showPrevious &&
                  previous.map((host) => <HostRow key={host.ID} host={host} />)}
              </VStack>
            )}
          </>
        )}
      </VStack>
    </ScrollView>
  );
}
