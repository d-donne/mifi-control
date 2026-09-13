import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { HStack } from "@/components/ui/hstack";
import ThreadView from "@/components/sms/ThreadView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAppColors } from "@/src/hooks/useAppColors";

export default function ThreadScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const color = useAppColors()

  return (
    <SafeAreaView>
      <VStack className="h-full bg-background">
        <HStack className="items-center px-4 py-2" space="sm">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={color.foreground} size={24} />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">{phone}</Text>
        </HStack>
        <ThreadView phone={phone ?? ""} />
      </VStack>
    </SafeAreaView>
  );
}
