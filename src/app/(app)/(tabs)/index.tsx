import { VStack } from "@/components/ui/vstack";
import Header from "@/components/dashboard/Header";
import HeroCard from "@/components/dashboard/HeroCard";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UsageStats from "@/components/dashboard/UsageStats";
import { useAppColors } from "@/src/hooks/useAppColors";

export default function Home() {
  const colors = useAppColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="flex-grow pb-6 px-3 pt-2">
        <Header />
        <VStack space="lg" className="">
          <HeroCard />
          <UsageStats />
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
