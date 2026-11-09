import { MessageSquare, Router } from "@/components/icons";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  useAllSms,
  useDeviceNotifications,
  useSmsConfig,
} from "@/src/hooks/useAllSms";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { smsStorageLevel, SmsStorageCard } from "./SmsStorage";

function SettingRow({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <HStack className="items-center gap-3.5 px-4 py-3.5">
      <Box className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
        {icon}
      </Box>
      <Text className="flex-1 text-foreground">{title}</Text>
      <Text className="text-muted-foreground" selectable>
        {value}
      </Text>
    </HStack>
  );
}

export default function SmsSettings() {
  const router = useRouter();
  const colors = useAppColors();
  const storage = useAllSms().data?.storage ?? null;
  const deviceSaysFull = useDeviceNotifications().data?.SmsStorageFull === 1;
  const level = smsStorageLevel(storage, deviceSaysFull);
  const config = useSmsConfig().data;
  const icon = { size: 18, color: colors.foreground };

  return (
    <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
      <VStack space="lg">
        <HStack className="items-center">
          <Heading size="xl" className="flex-1">
            SMS settings
          </Heading>
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>

        {level ? (
          <SmsStorageCard storage={storage} level={level} />
        ) : (
          <Box className="h-40 rounded-3xl bg-card" />
        )}

        {config && (
          <VStack className="overflow-hidden rounded-3xl bg-card">
            {config.Sca !== "" && (
              <>
                <SettingRow
                  icon={<MessageSquare {...icon} />}
                  title="Message centre"
                  value={config.Sca}
                />
                <Box className="mx-4 h-px bg-secondary" />
              </>
            )}
            <SettingRow
              icon={<Router {...icon} />}
              title="New texts saved on"
              value={config.SaveMode === 1 ? "SIM card" : "MiFi"}
            />
          </VStack>
        )}
      </VStack>
    </ScrollView>
  );
}
