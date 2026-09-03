import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Sms() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Center className="flex-1">
        <VStack space="md" className="items-center">
          <Text className="text-2xl font-bold text-foreground">SMS</Text>
          <Text className="text-sm text-muted-foreground">
            Read and send messages — coming soon
          </Text>
          <Text className="text-xs text-muted-foreground text-center px-8">
            Requires the /api/sms/sms-list endpoint, not yet implemented in
            HiLinkClient.
          </Text>
        </VStack>
      </Center>
    </SafeAreaView>
  );
}
