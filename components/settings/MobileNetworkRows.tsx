import ConfirmDialog from "@/components/common/ConfirmDialog";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  useDataRoaming,
  useNetworkMode,
  useSetDataRoaming,
  useSetNetworkMode,
} from "@/src/hooks/useMifiControls";
import { useState } from "react";

export const MODE_LABELS: Record<string, string> = {
  "00": "Auto",
  "03": "4G only",
  "02": "3G only",
  "01": "2G only",
};

export function DataRoamingRow() {
  const colors = useAppColors();
  const { data: enabled } = useDataRoaming();
  const toggle = useSetDataRoaming();

  return (
    <VStack className="py-1">
      <HStack className="items-center justify-between">
        <VStack className="flex-1 pr-3">
          <Text className="text-sm text-foreground">Data roaming</Text>
          <Text className="text-xs text-muted-foreground">
            {enabled
              ? "On: data works abroad, roaming charges apply"
              : "Off: no data on other countries' networks"}
          </Text>
        </VStack>
        <Switch
          value={enabled ?? false}
          onValueChange={(next) => toggle.mutate(next)}
          disabled={enabled === undefined || toggle.isPending}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={
            enabled ? colors.primaryForeground : colors.mutedForeground
          }
          accessibilityLabel="Data roaming"
        />
      </HStack>
      {toggle.error && (
        <Text className="text-xs text-destructive">
          Couldn&apos;t switch: {toggle.error.message}
        </Text>
      )}
    </VStack>
  );
}

export function NetworkModeRow() {
  const { data } = useNetworkMode();
  const change = useSetNetworkMode();
  const [pending, setPending] = useState<string | null>(null);
  const options = Object.keys(MODE_LABELS).filter((m) =>
    data?.available.includes(m),
  );

  return (
    <VStack className="gap-2 py-2">
      <VStack>
        <Text className="text-sm text-foreground">Network type</Text>
        <Text className="text-xs text-muted-foreground">
          {change.isPending
            ? "Reconnecting to the network…"
            : "Auto picks the best available network"}
        </Text>
      </VStack>
      {options.length > 0 && (
        <HStack className="gap-1 rounded-full bg-secondary p-1">
          {options.map((mode) => {
            const selected = mode === data?.mode;
            return (
              <Pressable
                key={mode}
                onPress={() => !selected && setPending(mode)}
                disabled={change.isPending}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-1 items-center rounded-full py-2 ${selected ? "bg-primary" : "data-[active=true]:bg-card"}`}
              >
                <Text
                  className={`text-sm font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {MODE_LABELS[mode]}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      )}
      {change.error && (
        <Text className="text-xs text-destructive">
          Couldn&apos;t change: {change.error.message}
        </Text>
      )}
      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        title={`Switch to ${pending ? MODE_LABELS[pending] : ""}?`}
        message="The MiFi reconnects to the network. Every connected device loses internet for a few seconds."
        confirmLabel="Switch"
        onConfirm={() => pending && change.mutate(pending)}
      />
    </VStack>
  );
}
