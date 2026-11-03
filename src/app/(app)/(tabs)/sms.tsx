import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import SmsList from "@/components/sms/SmsList";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppColors } from "@/src/hooks/useAppColors";

export default function Sms() {
  const colors = useAppColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <VStack className="flex-1">
        <Text className="px-4 pt-2 text-2xl font-bold text-foreground">
          SMS
        </Text>
        <SmsList />
      </VStack>
    </SafeAreaView>
  );
}
