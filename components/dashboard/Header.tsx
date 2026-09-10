import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { RefreshCw, User } from "lucide-react-native";
import { formatRelativeTime, getGreeting } from "@/src/api/utils/date";
import { getMonitoring } from "@/src/api/routes";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";

export default function Header() {
  const { dataUpdatedAt, error } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8000,
  });

  if (error) {
    return (
      <Text className="text-sm text-destructive">
        Status error: {String(error)}
      </Text>
    );
  }

  return (
    <HStack className="items-start justify-between pb-2">
      <Box>
        <Text className="text-2xl font-bold text-foreground">
          {getGreeting()}
        </Text>
        <HStack space="xs" className="items-center mt-1">
          <RefreshCw size={14} />
          <Text className="text-xs text-muted-foreground">
            {formatRelativeTime(dataUpdatedAt)}
          </Text>
        </HStack>
      </Box>
      <Pressable
        accessibilityLabel="Profile"
        accessibilityRole="button"
        hitSlop={8}
        className="bg-secondary rounded-full p-2"
      >
        <User size={18} className="text-secondary-foreground" />
      </Pressable>
    </HStack>
  );
}
