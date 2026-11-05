import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { WifiOff } from "@/components/icons";
import { useDeviceNotifications } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

export default function OfflineBanner() {
  const colors = useAppColors();
  const { isError, data } = useDeviceNotifications();
  if (!isError) return null;

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      accessibilityRole="alert"
      className="mb-2 self-center"
    >
      <Box className="flex-row items-center gap-2 rounded-full border border-destructive/40 bg-card px-4 py-2">
        <WifiOff size={14} color={colors.destructive} />
        <Text className="text-xs font-medium text-foreground">
          {data
            ? "Can't reach the MiFi · showing last known data"
            : "Can't reach the MiFi"}
        </Text>
      </Box>
    </Animated.View>
  );
}
