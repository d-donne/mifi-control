import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Header from "@/components/dashboard/Header";
import HeroCard from "@/components/dashboard/HeroCard";
import CircularProgress from "@/components/CircularProgress";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoredCredentials } from "../../hooks/useStoredCredentials";

export default function Home() {
  const { clear } = useStoredCredentials();
  const router = useRouter();

  return (
    <SafeAreaView>
      <ScrollView
        contentContainerClassName="flex-grow pb-6"
        className="bg-background h-full"
      >
        <Header />

        <HeroCard />

        <VStack space="md" className="mt-4 px-4">
          <Center>
            <CircularProgress progress={0.65}>
              <Text className="text-lg font-semibold">65%</Text>
              <Text className="text-sm text-muted-foreground">Data Used</Text>
            </CircularProgress>
          </Center>

          <Button
            variant="outline"
            onPress={async () => {
              await clear();
              router.replace("/settings");
            }}
          >
            <ButtonText>Logout</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
