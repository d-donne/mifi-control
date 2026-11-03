import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { splitHostAddresses } from "@/src/api/routes";
import type { LanHost } from "@/src/api/types";
import { formatDuration } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useLanHosts } from "@/src/hooks/useLanHosts";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { displayName, DeviceIcon } from "./hostDisplay";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <VStack className="py-2">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-foreground" selectable>
        {value}
      </Text>
    </VStack>
  );
}

function DeviceSummary({ host }: { host: LanHost }) {
  const colors = useAppColors();
  const connected = host.Active === 1;

  return (
    <HStack space="md" className="items-center">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-card">
        <DeviceIcon
          host={host}
          size={26}
          color={connected ? colors.primary : colors.mutedForeground}
        />
      </View>
      <VStack className="flex-1">
        <Heading size="xl" numberOfLines={2}>
          {displayName(host)}
        </Heading>
        <HStack space="xs" className="items-center">
          <View
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: connected
                ? colors.onlineDot
                : colors.mutedForeground,
            }}
          />
          <Text className="text-sm text-muted-foreground">
            {connected
              ? host.AssociatedTime > 0
                ? `Connected for ${formatDuration(host.AssociatedTime)}`
                : "Connected"
              : "Not connected"}
            {host.isLocalDevice === 1 ? " · This phone" : ""}
          </Text>
        </HStack>
      </VStack>
    </HStack>
  );
}

function DeviceInfo({ host }: { host: LanHost }) {
  const { ipv4, ipv6 } = splitHostAddresses(host.IpAddress);
  const reportedName =
    host.HostName && host.HostName !== host.ActualName ? host.HostName : null;

  return (
    <VStack className="rounded-3xl bg-card px-5 py-3">
      {ipv4 && <InfoRow label="IP address" value={ipv4} />}
      {ipv6 && <InfoRow label="IPv6 address" value={ipv6} />}
      <InfoRow label="MAC address" value={host.MacAddress} />
      {host.AssociatedSsid !== "" && (
        <InfoRow label="Wi-Fi network" value={host.AssociatedSsid} />
      )}
      <InfoRow
        label="Connection"
        value={host.InterfaceType === "Ethernet" ? "USB / Ethernet" : "Wi-Fi"}
      />
      {reportedName && (
        <InfoRow label="Name reported by the device" value={reportedName} />
      )}
    </VStack>
  );
}

export default function DeviceDetail({ mac }: { mac: string }) {
  const colors = useAppColors();
  const router = useRouter();
  const hosts = useLanHosts();
  const host = hosts.data?.find((h) => h.MacAddress === mac);

  return (
    <ScrollView
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <VStack space="lg">
        <HStack className="justify-end">
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>

        {host ? (
          <>
            <DeviceSummary host={host} />
            <DeviceInfo host={host} />
          </>
        ) : hosts.isPending ? (
          <ActivityIndicator color={colors.mutedForeground} />
        ) : (
          <Text className="text-sm text-muted-foreground">
            {hosts.error
              ? `Couldn't load the device: ${hosts.error.message}`
              : "This device is no longer in the MiFi's list."}
          </Text>
        )}
      </VStack>
    </ScrollView>
  );
}
