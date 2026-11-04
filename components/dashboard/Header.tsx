import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { formatRelativeTime, getGreeting } from "@/src/api/utils/date";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import { RefreshCw } from "@/components/icons";

export default function Header() {
  const colors = useAppColors();
  const { dataUpdatedAt } = useStatus();

  return (
    <Box className="pb-2">
      <Text className="text-2xl font-bold text-foreground">
        {getGreeting()}
      </Text>
      <HStack space="xs" className="mt-1 items-center">
        <RefreshCw size={14} color={colors.mutedForeground} />
        <Text className="text-xs text-muted-foreground">
          {dataUpdatedAt
            ? `Updated ${formatRelativeTime(dataUpdatedAt)}`
            : "Connecting…"}
        </Text>
      </HStack>
    </Box>
  );
}
