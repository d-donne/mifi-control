import { useTabBarClearance } from "@/components/TabBar";
import { VStack } from "@/components/ui/vstack";
import Header from "@/components/dashboard/Header";
import HeroCard from "@/components/dashboard/HeroCard";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UsageStats from "@/components/dashboard/UsageStats";
import { useAppColors } from "@/src/hooks/useAppColors";

export default function Home() {
  const colors = useAppColors();
  const clearance = useTabBarClearance();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerClassName="flex-grow px-3 pt-2"
        contentContainerStyle={{ paddingBottom: clearance }}
      >
        <Header />
        <VStack space="lg" className="">
          <HeroCard />
          <UsageStats />
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
