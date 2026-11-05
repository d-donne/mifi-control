import { HStack } from "@/components/ui/hstack";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useMobileData, useSetMobileData } from "@/src/hooks/useMifiControls";

export default function MobileDataRow() {
  const colors = useAppColors();
  const { data: enabled } = useMobileData();
  const toggle = useSetMobileData();

  return (
    <VStack className="py-1">
      <HStack className="items-center justify-between">
        <VStack className="flex-1 pr-3">
          <Text className="text-sm text-foreground">Mobile data</Text>
          <Text className="text-xs text-muted-foreground">
            {enabled === false
              ? "Off: connected devices have no internet"
              : "Internet for every connected device"}
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
          accessibilityLabel="Mobile data"
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
