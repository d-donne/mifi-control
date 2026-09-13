import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import SmsList from "@/components/sms/SmsList";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Sms() {
  return (
    <SafeAreaView>
      <VStack className="h-full bg-background">
        <Text className="text-2xl font-bold text-foreground px-4 pt-2">
          SMS
        </Text>
        <SmsList />
      </VStack>
    </SafeAreaView>
  );
}
