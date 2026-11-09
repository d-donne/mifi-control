import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Power, RefreshCw, type LucideIcon } from "@/components/icons";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { usePowerOff, useRestart } from "@/src/hooks/useMifiControls";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

function ActionRow({
  icon: Icon,
  title,
  status,
  failed,
  busy,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  failed: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={status}
      className="flex-row items-center gap-3 px-4 py-3 data-[active=true]:opacity-70"
    >
      <Box className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon size={18} color={colors.foreground} strokeWidth={1.9} />
        )}
      </Box>
      <VStack className="flex-1">
        <Text className="text-[15px] font-semibold text-foreground">
          {title}
        </Text>
        <Text
          className={`text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}
        >
          {status}
        </Text>
      </VStack>
    </Pressable>
  );
}

export default function PowerCard() {
  const restart = useRestart();
  const powerOff = usePowerOff();
  const [confirming, setConfirming] = useState<"restart" | "off" | null>(null);

  const offStatus = powerOff.isPending
    ? "Powering off…"
    : powerOff.error
      ? `Couldn't power off: ${powerOff.error.message}`
      : powerOff.isSuccess
        ? "Off. Press the MiFi's power button to turn it back on"
        : "Turn it back on with its power button";

  return (
    <VStack className="overflow-hidden rounded-3xl bg-card">
      <ActionRow
        icon={RefreshCw}
        title="Restart MiFi"
        status={restart.status}
        failed={restart.failed}
        busy={restart.busy}
        onPress={() => setConfirming("restart")}
      />
      <Box className="h-px bg-secondary" style={{ marginLeft: 64 }} />
      <ActionRow
        icon={Power}
        title="Power off"
        status={offStatus}
        failed={powerOff.isError}
        busy={powerOff.isPending}
        onPress={() => setConfirming("off")}
      />
      <ConfirmDialog
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        title={
          confirming === "off" ? "Power off the MiFi?" : "Restart the MiFi?"
        }
        message={
          confirming === "off"
            ? "Every device, including this phone, loses internet until someone presses the MiFi's power button."
            : "Every device, including this phone, loses Wi-Fi for about a minute."
        }
        confirmLabel={confirming === "off" ? "Power off" : "Restart"}
        destructive={confirming === "off"}
        onConfirm={() =>
          confirming === "off" ? powerOff.mutate() : void restart.start()
        }
      />
    </VStack>
  );
}
