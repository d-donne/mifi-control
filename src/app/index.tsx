import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Test from "../../components/test";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { Center } from "@/components/ui/center";
import CircularProgress from "@/components/CircularProgress";

export default function Index() {
  return (
    <SafeAreaView edges={["bottom"]}>
      <ScrollView className="bg-background">
        <Center>
          <Text className="text-2xl font-bold">MiFi Control</Text>
          <CircularProgress progress={0.65}>
            <Text className="text-lg font-semibold">65%</Text>
            <Text className="text-sm text-muted-foreground">Data Used</Text>
          </CircularProgress>
          <Test />
        </Center>
      </ScrollView>
    </SafeAreaView>
  );
}
