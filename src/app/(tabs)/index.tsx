import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import Header from "@/components/dashboard/Header";
import HeroCard from "@/components/dashboard/HeroCard";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoredCredentials } from "@/src/hooks/useStoredCredentials";
import UsageStats from "@/components/dashboard/UsageStats";
import { useAppColors } from "@/src/hooks/useAppColors";

export default function Home() {
  const { clear } = useStoredCredentials();
  const router = useRouter();
  const colors = useAppColors()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="flex-grow pb-6 px-3 pt-2"
      >
        <Header />
        <VStack space="lg" className="">
          <HeroCard />
          <UsageStats />
        </VStack>

        <VStack space="md" className="mt-4 px-4">
          <Button
            variant="outline"
            onPress={async () => {
              await clear();
              router.replace("/");
            }}
          >
            <ButtonText>Logout</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
