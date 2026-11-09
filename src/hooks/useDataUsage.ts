import { clearTraffic, getMonitoring } from "@/src/api/routes";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { TRAFFIC_QUERY_KEY } from "@/src/hooks/useDeviceStatus";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const DATA_PLAN_QUERY_KEY = ["plan"] as const;
export const MONTH_STATISTICS_QUERY_KEY = ["month"] as const;

export function useDataPlan() {
  return useHiLinkQuery({
    queryKey: DATA_PLAN_QUERY_KEY,
    queryFn: (client) => getMonitoring(client, "start_date"),
    staleTime: 5 * 60_000,
  });
}

export function useMonthStatistics() {
  return useHiLinkQuery({
    queryKey: MONTH_STATISTICS_QUERY_KEY,
    queryFn: (client) => getMonitoring(client, "month_statistics"),
    refetchInterval: 30_000,
  });
}

export function useClearTraffic() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearTraffic(client),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MONTH_STATISTICS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRAFFIC_QUERY_KEY }),
      ]),
  });
}
