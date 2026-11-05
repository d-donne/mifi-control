import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatClockTime, formatFullDateTime } from "@/src/api/utils/date";
import { useAppColors } from "@/src/hooks/useAppColors";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "restarting" }
  | { kind: "upToDate"; at: number }
  | { kind: "failed"; message: string };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="items-center justify-between py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text
        className="ml-4 flex-1 text-right text-sm text-foreground"
        numberOfLines={1}
        selectable
      >
        {value}
      </Text>
    </HStack>
  );
}

function UpdateButton() {
  const colors = useAppColors();
  // Also true when the startup check already downloaded an update.
  const { isUpdatePending } = Updates.useUpdates();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [downloaded, setDownloaded] = useState(false);
  const ready = isUpdatePending || downloaded;
  const available = __DEV__ ? false : Updates.isEnabled;

  async function run() {
    try {
      if (ready) {
        setPhase({ kind: "restarting" });
        await Updates.reloadAsync();
        return;
      }
      setPhase({ kind: "checking" });
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setPhase({ kind: "upToDate", at: Date.now() });
        return;
      }
      setPhase({ kind: "downloading" });
      await Updates.fetchUpdateAsync();
      setDownloaded(true);
      setPhase({ kind: "idle" });
    } catch (error) {
      setPhase({
        kind: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const busy =
    phase.kind === "checking" ||
    phase.kind === "downloading" ||
    phase.kind === "restarting";

  const title = available && ready ? "Restart to update" : "Check for updates";

  const status = !available
    ? "Off in development builds"
    : phase.kind === "checking"
      ? "Checking…"
      : phase.kind === "downloading"
        ? "Downloading…"
        : phase.kind === "restarting"
          ? "Restarting…"
          : phase.kind === "failed"
            ? `Couldn't update: ${phase.message}`
            : ready
              ? "Downloaded. Restart the app to use it"
              : phase.kind === "upToDate"
                ? `Up to date · checked ${formatClockTime(phase.at)}`
                : "The app also checks each time it starts";

  return (
    <Pressable
      onPress={() => void run()}
      disabled={!available || busy}
      accessibilityRole="button"
      accessibilityHint={status}
      className="flex-row items-center justify-between rounded-xl py-2 data-[active=true]:opacity-60"
    >
      <VStack className="flex-1 pr-3">
        <Text
          className="text-sm font-medium"
          style={{
            color: !available
              ? colors.mutedForeground
              : ready
                ? colors.accent
                : colors.foreground,
          }}
        >
          {title}
        </Text>
        <Text
          className="text-xs"
          style={{
            color:
              phase.kind === "failed"
                ? colors.destructive
                : colors.mutedForeground,
          }}
        >
          {status}
        </Text>
      </VStack>
      {busy && <ActivityIndicator color={colors.accent} />}
    </Pressable>
  );
}

export default function AppUpdates() {
  const { currentlyRunning } = Updates.useUpdates();

  return (
    <VStack>
      <InfoRow label="Version" value={Constants.expoConfig?.version ?? "—"} />
      <InfoRow
        label="Running"
        value={
          currentlyRunning.isEmbeddedLaunch || !currentlyRunning.createdAt
            ? "Built-in"
            : `Update of ${formatFullDateTime(currentlyRunning.createdAt.getTime())}`
        }
      />
      <InfoRow
        label="Runtime"
        value={currentlyRunning.runtimeVersion?.slice(0, 8) ?? "—"}
      />
      <UpdateButton />
    </VStack>
  );
}
