import { Box } from "../ui/box";
import { HStack } from "../ui/hstack";
import BatteryRingCard from "./BatteryRingCard";
import DataRingCard from "./DataRingCard";

export default function UsageStats() {
  return (
    <HStack space="md">
      <Box className="flex-1">
        <BatteryRingCard />
      </Box>
      <Box className="flex-1">
        <DataRingCard />
      </Box>
    </HStack>
  );
}
