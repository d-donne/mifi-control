import { getMobileData, reboot, setMobileData } from "@/src/api/routes";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { STATUS_QUERY_KEY } from "@/src/hooks/useDeviceStatus";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const MOBILE_DATA_QUERY_KEY = ["mobile-data"] as const;

export function useMobileData() {
  return useHiLinkQuery({
    queryKey: MOBILE_DATA_QUERY_KEY,
    queryFn: getMobileData,
    refetchInterval: 30_000,
  });
}

export function useSetMobileData() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setMobileData(client, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: MOBILE_DATA_QUERY_KEY });
      const previous = queryClient.getQueryData<boolean>(MOBILE_DATA_QUERY_KEY);
      queryClient.setQueryData(MOBILE_DATA_QUERY_KEY, enabled);
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(MOBILE_DATA_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MOBILE_DATA_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
      ]),
  });
}

export function useReboot() {
  const client = useHiLinkClient();
  return useMutation({ mutationFn: () => reboot(client) });
}
