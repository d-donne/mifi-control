import ConfirmDialog from "@/components/common/ConfirmDialog";
import { RefreshCw } from "@/components/icons";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useRestart } from "@/src/hooks/useMifiControls";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

export default function RestartCard() {
  const colors = useAppColors();
  const restart = useRestart();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setConfirming(true)}
        disabled={restart.busy}
        accessibilityRole="button"
        accessibilityLabel="Restart MiFi"
        accessibilityHint={restart.status}
        className="flex-row items-center gap-3 rounded-3xl bg-card px-4 py-3 data-[active=true]:opacity-70"
      >
        <Box className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
          {restart.busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={18} color={colors.foreground} strokeWidth={1.9} />
          )}
        </Box>
        <VStack className="flex-1">
          <Text className="text-[15px] font-semibold text-foreground">
            Restart MiFi
          </Text>
          <Text
            className={`text-xs ${restart.failed ? "text-destructive" : "text-muted-foreground"}`}
          >
            {restart.status}
          </Text>
        </VStack>
      </Pressable>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title="Restart the MiFi?"
        message="Every device, including this phone, loses Wi-Fi for about a minute."
        confirmLabel="Restart"
        onConfirm={() => void restart.start()}
      />
    </>
  );
}
