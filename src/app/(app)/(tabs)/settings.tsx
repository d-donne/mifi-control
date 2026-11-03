import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { getDevice } from "@/src/api/routes";
import { parseDataLimit } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useDataPlan } from "@/src/hooks/useDataUsage";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut } from "lucide-react-native";
import type { ReactNode } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack className="rounded-3xl bg-card px-5 py-3">
      <Text className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase">
        {title}
      </Text>
      {children}
    </VStack>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <HStack className="items-center justify-between py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text
        className="ml-4 flex-1 text-right text-sm text-foreground"
        numberOfLines={1}
      >
        {value || "—"}
      </Text>
    </HStack>
  );
}

function describePlan(plan: ReturnType<typeof useDataPlan>["data"]): string {
  if (!plan) return "—";
  const limit = parseDataLimit(plan.DataLimit);
  if (plan.SetMonthData !== 1 || !limit || limit.amount === 0) return "Not set";
  return `${limit.amount} ${limit.unit} · resets day ${plan.StartDay}`;
}

export default function Settings() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: plan } = useDataPlan();
  const credentials = useSession((s) => s.credentials);
  const signOut = useSession((s) => s.signOut);
  const { data: device } = useHiLinkQuery({
    queryKey: ["device"],
    queryFn: (client) => getDevice(client, "information"),
  });

  function confirmSignOut() {
    Alert.alert(
      "Sign out?",
      "You'll need the MiFi's admin password to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => void signOut(),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-4 pt-2 pb-28">
        <VStack space="lg">
          <Heading size="2xl">Settings</Heading>

          <Section title="Device">
            <Row
              label="Model"
              value={device ? `HUAWEI ${device.DeviceName}` : undefined}
            />
            <Row label="Firmware" value={device?.SoftwareVersion} />
            <Row label="IMEI" value={device?.Imei} />
          </Section>

          <Section title="Usage">
            <Pressable
              onPress={() => router.push("/data-plan")}
              accessibilityRole="button"
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-sm text-muted-foreground">Data plan</Text>
              <HStack
                space="xs"
                className="ml-4 flex-1 items-center justify-end"
              >
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {describePlan(plan)}
                </Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </HStack>
            </Pressable>
          </Section>

          <Section title="Connection">
            <Row
              label="Address"
              value={credentials?.baseUrl.replace(/^https?:\/\//, "")}
            />
            <Row label="Signed in as" value={credentials?.username} />
          </Section>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            onPress={confirmSignOut}
          >
            <LogOut size={18} color={colors.destructive} />
            <ButtonText className="text-destructive">Sign out</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
