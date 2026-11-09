import { InfoRow } from "@/components/settings/SettingsParts";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatFullDateTime } from "@/src/api/utils/date";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useAppUpdate } from "@/src/hooks/useAppUpdate";
import Constants from "expo-constants";
import { ActivityIndicator } from "react-native";

export default function AppUpdates() {
  const colors = useAppColors();
  const update = useAppUpdate();
  const running = update.currentlyRunning;

  return (
    <VStack>
      <InfoRow label="Version" value={Constants.expoConfig?.version} />
      <InfoRow
        label="Running"
        value={
          running.isEmbeddedLaunch || !running.createdAt
            ? "Built-in"
            : `Update of ${formatFullDateTime(running.createdAt.getTime())}`
        }
      />
      <InfoRow label="Runtime" value={running.runtimeVersion?.slice(0, 8)} />
      <Pressable
        onPress={() => void update.run()}
        disabled={!update.available || update.busy}
        accessibilityRole="button"
        accessibilityHint={update.status}
        className="flex-row items-center justify-between py-3 data-[active=true]:opacity-60"
      >
        <VStack className="flex-1 pr-3">
          <Text
            className="text-sm font-medium"
            style={{
              color: !update.available
                ? colors.mutedForeground
                : update.ready
                  ? colors.accent
                  : colors.foreground,
            }}
          >
            {update.action}
          </Text>
          <Text
            className="text-xs"
            style={{
              color: update.failed
                ? colors.destructive
                : colors.mutedForeground,
            }}
          >
            {update.status}
          </Text>
        </VStack>
        {update.busy && <ActivityIndicator color={colors.accent} />}
      </Pressable>
    </VStack>
  );
}
