import { getProgress } from "@/components/common/CircularProgress";
import { formatBytes } from "@/src/api/utils";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useQuery } from "@tanstack/react-query";
import StatRingCard from "./StatRingCard";

const DATA_CAP_BYTES = 5 * 1024 * 1024 * 1024;

export default function DataRingCard() {
  const client = useHiLinkClient();
  const colors = useAppColors();

  const { data: traffic } = useQuery({
    queryKey: ["traffic"],
    queryFn: () => client.getMonitoring("traffic-statistics"),
    refetchInterval: 8000,
  });

  const bytes = traffic?.TotalDownload ?? 0;

  return (
    <StatRingCard
      progress={getProgress(bytes, DATA_CAP_BYTES)}
      activeColor={colors.dataRing}
      trackColor={colors.dataRingTrack}
      primary={formatBytes(bytes)}
      secondary="of 5 GB"
    />
  );
}
