import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ChevronRight, LogOut, Router } from "@/components/icons";
import RestartCard from "@/components/settings/RestartCard";
import {
  AppCard,
  AppearanceCard,
  NetworkCard,
} from "@/components/settings/SettingsCards";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatDuration, num } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useDeviceInfo } from "@/src/hooks/useDeviceStatus";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function DeviceCard() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: device } = useDeviceInfo();

  return (
    <Pressable
      onPress={() => router.push("/settings/device")}
      accessibilityRole="button"
      accessibilityLabel="This MiFi"
      accessibilityHint="Opens device details"
      className="flex-row items-center gap-4 rounded-3xl bg-card px-4 py-3.5 data-[active=true]:opacity-80"
    >
      <Box className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
        <Router size={22} color={colors.primary} />
      </Box>
      <VStack className="flex-1">
        <Text className="font-semibold text-foreground">
          {device ? `HUAWEI ${device.DeviceName}` : "Your MiFi"}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {device
            ? `Up ${formatDuration(num(device.uptime))} · firmware ${device.SoftwareVersion}`
            : "Loading…"}
        </Text>
      </VStack>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function Settings() {
  const colors = useAppColors();
  const signOut = useSession((s) => s.signOut);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-4 pt-2 pb-28">
        <VStack space="md">
          <Heading size="2xl">Settings</Heading>

          <DeviceCard />

          <NetworkCard />
          <AppearanceCard />
          <AppCard />

          <RestartCard />

          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            onPress={() => setConfirmingSignOut(true)}
          >
            <LogOut size={18} color={colors.destructive} />
            <ButtonText className="text-destructive">Sign out</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
      <ConfirmDialog
        isOpen={confirmingSignOut}
        onClose={() => setConfirmingSignOut(false)}
        title="Sign out?"
        message="You'll need the MiFi's admin password to sign in again."
        confirmLabel="Sign out"
        onConfirm={() => void signOut()}
      />
    </SafeAreaView>
  );
}
