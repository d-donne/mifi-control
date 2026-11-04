import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { formatRelativeTime, getGreeting } from "@/src/api/utils/date";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useStatus } from "@/src/hooks/useDeviceStatus";
import { RefreshCw, WifiOff } from "lucide-react-native";

function freshness(updatedAt: number, failing: boolean): string {
  const updated = updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : "";
  if (!failing) return updated || "Connecting…";
  return updated
    ? `Can't reach the MiFi · ${updated.toLowerCase()}`
    : "Can't reach the MiFi";
}

export default function Header() {
  const colors = useAppColors();
  const { dataUpdatedAt, isError } = useStatus();
  const Icon = isError ? WifiOff : RefreshCw;

  return (
    <Box className="pb-2">
      <Text className="text-2xl font-bold text-foreground">
        {getGreeting()}
      </Text>
      <HStack space="xs" className="mt-1 items-center">
        <Icon
          size={14}
          color={isError ? colors.destructive : colors.mutedForeground}
        />
        <Text
          className={
            isError
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {freshness(dataUpdatedAt, isError)}
        </Text>
      </HStack>
    </Box>
  );
}
