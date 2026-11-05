import { useTabBarClearance } from "@/components/TabBar";
import BatteryRingCard from "@/components/dashboard/BatteryRingCard";
import DataRingCard from "@/components/dashboard/DataRingCard";
import DevicesSummaryCard from "@/components/dashboard/DevicesSummaryCard";
import Header from "@/components/dashboard/Header";
import HeroCard from "@/components/dashboard/HeroCard";
import QuickActions from "@/components/dashboard/QuickActions";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const colors = useAppColors();
  const clearance = useTabBarClearance();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerClassName="flex-grow px-4 pt-2"
        contentContainerStyle={{ paddingBottom: clearance }}
      >
        <Header />
        <VStack space="md" className="mt-2">
          <HeroCard />
          <HStack space="md">
            <BatteryRingCard />
            <DataRingCard />
          </HStack>
          <DevicesSummaryCard />
          <VStack className="mt-3">
            <QuickActions />
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
