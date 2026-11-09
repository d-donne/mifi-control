import ConfirmDialog from "@/components/common/ConfirmDialog";
import { InfoRow, Segmented } from "@/components/settings/SettingsParts";
import { HStack } from "@/components/ui/hstack";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { WifiNetwork } from "@/src/api/routes";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import {
  useSetGuestWifi,
  useSetWifiAutoOff,
  useWifiSettings,
  type GuestChange,
} from "@/src/hooks/useWifiSettings";
import { useState } from "react";

const GUEST_HOURS = [
  { value: 0, label: "Always" },
  { value: 4, label: "4 hours" },
  { value: 24, label: "24 hours" },
];

// The web UI's fallback list; 0 means Wi-Fi never turns itself off.
const AUTO_OFF_SECONDS = [0, 600, 1200, 1800];

export function securityLabel(security: string): string {
  if (security === "OPEN") return "Open, no password";
  if (security.startsWith("WPA2")) return "Password (WPA2)";
  if (security.startsWith("WPA")) return "Password (WPA)";
  return security || "—";
}

function minutes(seconds: number): string {
  return seconds === 0 ? "Never" : `${Math.round(seconds / 60)} min`;
}

export function MainNetworkInfo({ network }: { network: WifiNetwork }) {
  const { data: status } = useStatus();
  return (
    <VStack>
      <InfoRow label="Network name" value={network.name} />
      <InfoRow label="Security" value={securityLabel(network.security)} />
      <InfoRow
        label="Connected"
        value={
          status
            ? `${status.CurrentWifiUser} of ${status.TotalWifiUser} devices`
            : undefined
        }
      />
    </VStack>
  );
}

const RESTART_NOTE =
  "Wi-Fi restarts to apply this, so every device, including this phone, disconnects for a few seconds.";

/** Every guest change restarts Wi-Fi for everyone, so each one confirms first. */
function useConfirmedGuestChange(guest: WifiNetwork | undefined) {
  const change = useSetGuestWifi();
  const [pending, setPending] = useState<GuestChange | null>(null);

  const turningOn = pending?.enabled === true && !guest?.enabled;
  const turningOff = pending?.enabled === false;
  const dialog = (
    <ConfirmDialog
      isOpen={pending !== null}
      onClose={() => setPending(null)}
      title={
        turningOn
          ? "Turn on the guest network?"
          : turningOff
            ? "Turn off the guest network?"
            : "Change how long it stays on?"
      }
      message={
        turningOn
          ? `${RESTART_NOTE} The guest network is open: anyone nearby can join.`
          : turningOff
            ? `${RESTART_NOTE} Guests lose access.`
            : RESTART_NOTE
      }
      confirmLabel={turningOn ? "Turn on" : turningOff ? "Turn off" : "Change"}
      onConfirm={() => pending && change.mutate(pending)}
    />
  );

  return { change, request: setPending, dialog };
}

export function GuestWifiRows({ guest }: { guest: WifiNetwork }) {
  const colors = useAppColors();
  const { change, request, dialog } = useConfirmedGuestChange(guest);

  return (
    <VStack className="gap-3 py-2">
      <HStack className="items-center justify-between">
        <VStack className="flex-1 pr-3">
          <Text className="text-sm text-foreground">Guest network</Text>
          <Text className="text-xs text-muted-foreground">
            {change.isPending
              ? "Restarting Wi-Fi…"
              : guest.enabled
                ? `"${guest.name}" · ${securityLabel(guest.security)}`
                : "A separate network for visitors"}
          </Text>
        </VStack>
        <Switch
          value={guest.enabled}
          onValueChange={(enabled) =>
            request({ enabled, offHours: guest.guestOffHours })
          }
          disabled={change.isPending}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={
            guest.enabled ? colors.primaryForeground : colors.mutedForeground
          }
          accessibilityLabel="Guest network"
        />
      </HStack>
      {guest.enabled && (
        <VStack className="gap-2">
          <Text className="text-xs text-muted-foreground">Stays on for</Text>
          <Segmented
            options={GUEST_HOURS}
            value={guest.guestOffHours}
            onChange={(offHours) => request({ enabled: true, offHours })}
            disabled={change.isPending}
          />
        </VStack>
      )}
      {change.error && (
        <Text className="text-xs text-destructive">
          Couldn&apos;t change: {change.error.message}
        </Text>
      )}
      {dialog}
    </VStack>
  );
}

export function AutoOffRows({ seconds }: { seconds: number }) {
  const change = useSetWifiAutoOff();
  const values = AUTO_OFF_SECONDS.includes(seconds)
    ? AUTO_OFF_SECONDS
    : [...AUTO_OFF_SECONDS, seconds].sort((a, b) => a - b);

  return (
    <VStack className="gap-2 py-2">
      <VStack>
        <Text className="text-sm text-foreground">
          Turn Wi-Fi off when idle
        </Text>
        <Text className="text-xs text-muted-foreground">
          Saves battery when no device is connected
        </Text>
      </VStack>
      <Segmented
        options={values.map((value) => ({ value, label: minutes(value) }))}
        value={seconds}
        onChange={(next) => change.mutate(next)}
        disabled={change.isPending}
      />
      {change.error && (
        <Text className="text-xs text-destructive">
          Couldn&apos;t change: {change.error.message}
        </Text>
      )}
    </VStack>
  );
}

export function useWifiSummary() {
  const { data } = useWifiSettings();
  const main = data?.networks.find((n) => !n.guest);
  const guest = data?.networks.find((n) => n.guest);
  return { data, main, guest };
}
