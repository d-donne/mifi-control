import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { splitHostAddresses } from "@/src/api/routes";
import type { LanHost } from "@/src/api/types";
import { formatDuration } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  useBlockDevice,
  useForgetDevice,
  useMacFilter,
  useRenameDevice,
  useUnblockDevice,
} from "@/src/hooks/useDeviceActions";
import { useLanHosts } from "@/src/hooks/useLanHosts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import ConfirmDialog from "../common/ConfirmDialog";
import { displayName, DeviceIcon, isMacLike, isUnnamed } from "./hostDisplay";

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

function DeviceSummary({ host, blocked }: { host: LanHost; blocked: boolean }) {
  const colors = useAppColors();
  const connected = host.Active === 1;

  return (
    <HStack space="md" className="items-center">
      <Box className="h-14 w-14 items-center justify-center rounded-full bg-card">
        <DeviceIcon
          host={host}
          size={26}
          color={connected ? colors.accent : colors.mutedForeground}
        />
      </Box>
      <VStack className="flex-1">
        <Heading size="xl" numberOfLines={2}>
          {displayName(host)}
        </Heading>
        <HStack space="xs" className="items-center">
          <Box
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: blocked
                ? colors.destructive
                : connected
                  ? colors.onlineDot
                  : colors.mutedForeground,
            }}
          />
          <Text className="text-sm text-muted-foreground">
            {blocked
              ? "Blocked"
              : connected
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
    </VStack>
  );
}

// The web UI caps names at 64 bytes, counting non-ASCII characters as 3.
const MAX_NAME_BYTES = 64;

function nameByteLength(name: string): number {
  let bytes = 0;
  for (const char of name) bytes += char.charCodeAt(0) > 0x7f ? 3 : 1;
  return bytes;
}

function RenameCard({ host }: { host: LanHost }) {
  const colors = useAppColors();
  const rename = useRenameDevice();
  const [draft, setDraft] = useState<string | null>(null);
  const current = isUnnamed(host) ? "" : host.ActualName;
  const renamed = host.HostName !== "" && host.ActualName !== host.HostName;
  const reportsName = !isMacLike(host.HostName);
  const name = draft?.trim() ?? "";
  const tooLong = nameByteLength(name) > MAX_NAME_BYTES;

  function save() {
    if (name === "" || name === host.ActualName) {
      setDraft(null);
      return;
    }
    if (tooLong) return;
    rename.mutate({ id: host.ID, name }, { onSuccess: () => setDraft(null) });
  }

  function resetName() {
    rename.mutate({ id: host.ID, name: host.HostName });
  }

  if (draft === null) {
    return (
      <VStack className="rounded-3xl bg-card py-3 pr-3 pl-5">
        <HStack className="items-center justify-between">
          <VStack className="flex-1 pr-3">
            <Text className="text-xs text-muted-foreground">Name</Text>
            <Text className="text-foreground" numberOfLines={1}>
              {displayName(host)}
            </Text>
          </VStack>
          <Button variant="outline" size="sm" onPress={() => setDraft(current)}>
            <ButtonText>Rename</ButtonText>
          </Button>
        </HStack>
        {renamed && (
          <HStack className="items-center justify-between pt-2">
            <Text
              className="flex-1 pr-3 text-xs text-muted-foreground"
              numberOfLines={2}
            >
              {reportsName
                ? `The device's own name is ${host.HostName}`
                : "The device doesn't send a name"}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onPress={resetName}
              isDisabled={rename.isPending}
            >
              {rename.isPending && <ButtonSpinner />}
              <ButtonText>{reportsName ? "Use it" : "Clear name"}</ButtonText>
            </Button>
          </HStack>
        )}
        {rename.error && (
          <Text className="pt-1 text-sm text-destructive">
            Couldn&apos;t rename: {rename.error.message}
          </Text>
        )}
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="rounded-3xl bg-card p-5">
      <Text className="text-xs text-muted-foreground">Name</Text>
      <Input>
        <InputField
          value={draft}
          onChangeText={setDraft}
          placeholder="Living room TV"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </Input>
      {tooLong ? (
        <Text className="text-sm text-destructive">That name is too long.</Text>
      ) : (
        rename.error && (
          <Text className="text-sm text-destructive">
            Couldn&apos;t rename: {rename.error.message}
          </Text>
        )
      )}
      <HStack space="sm" className="justify-end">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            rename.reset();
            setDraft(null);
          }}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          size="sm"
          onPress={save}
          isDisabled={rename.isPending || tooLong}
        >
          {rename.isPending && (
            <ButtonSpinner color={colors.primaryForeground} />
          )}
          <ButtonText>Save</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}

function BlockAction({ host, blocked }: { host: LanHost; blocked: boolean }) {
  const block = useBlockDevice();
  const unblock = useUnblockDevice();
  const pending = block.isPending || unblock.isPending;
  const error = block.error ?? unblock.error;
  const name = displayName(host);

  const [confirming, setConfirming] = useState(false);

  return (
    <VStack space="sm">
      {blocked ? (
        <Button
          variant="outline"
          size="lg"
          className="rounded-full"
          onPress={() => unblock.mutate(host.MacAddress)}
          isDisabled={pending}
        >
          {pending && <ButtonSpinner />}
          <ButtonText>Unblock device</ButtonText>
        </Button>
      ) : (
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full"
          onPress={() => setConfirming(true)}
          isDisabled={pending}
        >
          {pending && <ButtonSpinner color="white" />}
          <ButtonText>Block device</ButtonText>
        </Button>
      )}
      {error && (
        <Text className="text-center text-sm text-destructive">
          {error.message}
        </Text>
      )}
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={`Block ${name}?`}
        message="It will be disconnected and can't rejoin the Wi-Fi until you unblock it."
        confirmLabel="Block"
        onConfirm={() => block.mutate(host)}
      />
    </VStack>
  );
}

function ForgetAction({ host }: { host: LanHost }) {
  const router = useRouter();
  const forget = useForgetDevice();

  const [confirming, setConfirming] = useState(false);

  return (
    <VStack space="sm">
      <Button
        variant="ghost"
        size="lg"
        className="rounded-full"
        onPress={() => setConfirming(true)}
        isDisabled={forget.isPending}
      >
        {forget.isPending && <ButtonSpinner />}
        <ButtonText>Remove from list</ButtonText>
      </Button>
      {forget.error && (
        <Text className="text-center text-sm text-destructive">
          {forget.error.message}
        </Text>
      )}
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={`Remove ${displayName(host)}?`}
        message="It disappears from the device list. It isn't blocked, and shows up again if it reconnects."
        confirmLabel="Remove"
        onConfirm={() => {
          forget.mutate(host);
          router.back();
        }}
      />
    </VStack>
  );
}

export default function DeviceDetail({ mac }: { mac: string }) {
  const colors = useAppColors();
  const router = useRouter();
  const hosts = useLanHosts();
  const { data: filter } = useMacFilter();
  const host = hosts.data?.find((h) => h.MacAddress === mac);
  const blocked =
    filter?.blocked.some((d) => d.mac === mac.toUpperCase()) ?? false;

  return (
    <ScrollView
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <VStack space="lg">
        <HStack className="items-start">
          <Box className="flex-1">
            {host && <DeviceSummary host={host} blocked={blocked} />}
          </Box>
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>

        {host ? (
          <>
            <RenameCard host={host} />
            <DeviceInfo host={host} />
            {host.isLocalDevice !== 1 && (
              <BlockAction host={host} blocked={blocked} />
            )}
            {host.Active === 0 && host.isLocalDevice !== 1 && (
              <ForgetAction host={host} />
            )}
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
