import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Test from "../../components/test";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { Center } from "@/components/ui/center";

export default function Index() {
  return (
    <SafeAreaView edges={["bottom"]}>
      <ScrollView className="bg-background">
        <Center>
          <Text className="text-2xl font-bold">MiFi Control</Text>
          <Test />
        </Center>
      </ScrollView>
    </SafeAreaView>
  );
}
