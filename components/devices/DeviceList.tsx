import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { LanHost } from "@/src/api/types";
import {
  getLanHosts,
  getMonitoring,
  splitHostAddresses,
} from "@/src/api/routes";
import { formatDuration } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import {
  Cable,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Wifi,
} from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView } from "react-native";

function byName(a: LanHost, b: LanHost): number {
  return a.HostName.localeCompare(b.HostName);
}

function HostRow({ host }: { host: LanHost }) {
  const colors = useAppColors();
  const { ipv4 } = splitHostAddresses(host.IpAddress);
  const connected = host.Active === 1;
  const Icon = host.isLocalDevice
    ? Smartphone
    : host.InterfaceType === "Ethernet"
      ? Cable
      : Wifi;
  const details = [
    ipv4,
    connected && host.AssociatedTime > 0
      ? `connected ${formatDuration(host.AssociatedTime)}`
      : null,
  ].filter(Boolean);

  return (
    <HStack space="md" className="items-center py-3">
      <VStack className="h-10 w-10 items-center justify-center rounded-full bg-background">
        <Icon
          size={18}
          color={connected ? colors.primary : colors.mutedForeground}
        />
      </VStack>
      <VStack className="flex-1">
        <HStack space="sm" className="items-center">
          <Text
            className={
              connected
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
            numberOfLines={1}
          >
            {host.HostName || host.MacAddress}
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
    </HStack>
  );
}

export default function DeviceList() {
  const colors = useAppColors();
  const [showPrevious, setShowPrevious] = useState(false);

  const hosts = useHiLinkQuery({
    queryKey: ["hosts"],
    queryFn: getLanHosts,
    refetchInterval: 30_000,
  });
  const { data: status } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8000,
  });

  const all = hosts.data ?? [];
  const connected = all
    .filter((h) => h.Active === 1)
    .sort((a, b) => b.isLocalDevice - a.isLocalDevice || byName(a, b));
  const previous = all.filter((h) => h.Active === 0).sort(byName);

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
        <VStack>
          <Heading size="2xl">Devices</Heading>
          <Text className="text-sm text-muted-foreground">
            {hosts.data
              ? `${connected.length} connected${status ? ` · up to ${status.TotalWifiUser}` : ""}`
              : "Checking connected devices…"}
          </Text>
        </VStack>

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
            <VStack className="rounded-3xl bg-card px-5 py-1">
              {connected.length === 0 ? (
                <Text className="py-4 text-sm text-muted-foreground">
                  No devices connected right now.
                </Text>
              ) : (
                connected.map((host) => <HostRow key={host.ID} host={host} />)
              )}
            </VStack>

            {previous.length > 0 && (
              <VStack className="rounded-3xl bg-card px-5 py-1">
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
