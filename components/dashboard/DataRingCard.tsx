import { getProgress } from "@/components/common/CircularProgress";
import { getMonitoring } from "@/src/api/routes";
import { formatBytes } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import StatRingCard from "./StatRingCard";

const DATA_CAP_BYTES = 5 * 1024 * 1024 * 1024;

export default function DataRingCard() {
  const colors = useAppColors();

  const { data: traffic } = useHiLinkQuery({
    queryKey: ["traffic"],
    queryFn: (client) => getMonitoring(client, "traffic-statistics"),
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
