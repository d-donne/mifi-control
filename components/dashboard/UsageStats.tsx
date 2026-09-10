import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useQuery } from "@tanstack/react-query";
import StatRingCard, { useStatRingColors } from "./StatRingCard";
import { Box } from "../ui/box";
import { HStack } from "../ui/hstack";
import { formatBytes } from "@/src/api/utils";
import { getProgress } from "../common/CircularProgress";
import { PlugZap } from "lucide-react-native";

export default function UsageStats() {
  const client = useHiLinkClient();
  const batteryColors = useStatRingColors("battery");
  const dataColors = useStatRingColors("data");

  /**
   * Hardcoded 5 GB monthly data cap. The MiFi API doesn't expose the user's
   * plan size; this is a v1 placeholder. TODO: persist as a Settings field
   * or read from a billing-cycle endpoint when available.
   * v2: the api actually exposes this, but deferred for later.
   */
  const DATA_CAP_BYTES = 5 * 1024 * 1024 * 1024;

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getStatus(),
    refetchInterval: 8000,
  });

  const { data: traffic } = useQuery({
    queryKey: ["traffic"],
    queryFn: () => client.getTraffic(),
    refetchInterval: 8000,
  });

  return (
    <HStack space="md">
      <Box className="flex-1">
        <StatRingCard
          progress={getProgress(status?.BatteryPercent ?? 0, 100)}
          activeColor={batteryColors.active}
          trackColor={batteryColors.track}
          primary={`${status?.BatteryPercent ?? 0}%`}
          secondary="battery"
          charging={Boolean(status?.BatteryStatus)}
        />
      </Box>
      <Box className="flex-1">
        <StatRingCard
          progress={getProgress(traffic?.TotalDownload ?? 0, DATA_CAP_BYTES)}
          activeColor={dataColors.active}
          trackColor={dataColors.track}
          primary={formatBytes(traffic?.TotalDownload ?? 0)}
          secondary="of 5 GB"
        />
      </Box>
    </HStack>
  );
}
