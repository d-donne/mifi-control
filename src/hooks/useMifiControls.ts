import {
  getDataRoaming,
  getMobileData,
  getNetworkMode,
  reboot,
  setDataRoaming,
  setMobileData,
  setNetworkMode,
  type NetworkMode,
} from "@/src/api/routes";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { STATUS_QUERY_KEY } from "@/src/hooks/useDeviceStatus";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const MOBILE_DATA_QUERY_KEY = ["mobile-data"] as const;
export const ROAMING_QUERY_KEY = ["roaming"] as const;
export const NETWORK_MODE_QUERY_KEY = ["net-mode"] as const;

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

export function useDataRoaming() {
  return useHiLinkQuery({
    queryKey: ROAMING_QUERY_KEY,
    queryFn: getDataRoaming,
    staleTime: 60_000,
  });
}

export function useSetDataRoaming() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setDataRoaming(client, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ROAMING_QUERY_KEY });
      const previous = queryClient.getQueryData<boolean>(ROAMING_QUERY_KEY);
      queryClient.setQueryData(ROAMING_QUERY_KEY, enabled);
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(ROAMING_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ROAMING_QUERY_KEY }),
  });
}

export function useNetworkMode() {
  return useHiLinkQuery({
    queryKey: NETWORK_MODE_QUERY_KEY,
    queryFn: getNetworkMode,
    staleTime: 60_000,
  });
}

export function useSetNetworkMode() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: string) => setNetworkMode(client, mode),
    onSuccess: (_result, mode) => {
      queryClient.setQueryData<NetworkMode>(NETWORK_MODE_QUERY_KEY, (old) =>
        old ? { ...old, mode } : old,
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: NETWORK_MODE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
      ]),
  });
}
