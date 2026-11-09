import { HiLinkError } from "@/src/api/errors";
import {
  getWifiSettings,
  setGuestWifi,
  setWifiAutoOff,
  type WifiSettings,
} from "@/src/api/routes";
import { sleep } from "@/src/api/utils";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

export const WIFI_QUERY_KEY = ["wifi"] as const;

export function useWifiSettings() {
  return useHiLinkQuery({
    queryKey: WIFI_QUERY_KEY,
    queryFn: getWifiSettings,
    staleTime: 30_000,
  });
}

function optimistic(
  queryClient: QueryClient,
  update: (old: WifiSettings) => WifiSettings,
) {
  return async () => {
    await queryClient.cancelQueries({ queryKey: WIFI_QUERY_KEY });
    const previous = queryClient.getQueryData<WifiSettings>(WIFI_QUERY_KEY);
    if (previous) queryClient.setQueryData(WIFI_QUERY_KEY, update(previous));
    return { previous };
  };
}

export function useSetGuestWifi() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enabled, offHours }: GuestChange) => {
      try {
        await setGuestWifi(client, enabled, offHours);
      } catch (error) {
        // Wi-Fi restarts as it saves, which can cut the answer off; check what it applied.
        if (error instanceof HiLinkError) throw error;
        await sleep(5_000);
        const guest = (await getWifiSettings(client)).networks.find(
          (n) => n.guest,
        );
        if (guest?.enabled !== enabled) throw error;
      }
    },
    onMutate: (change) =>
      optimistic(queryClient, (old) => ({
        ...old,
        networks: old.networks.map((n) =>
          n.guest
            ? { ...n, enabled: change.enabled, guestOffHours: change.offHours }
            : n,
        ),
      }))(),
    onError: (_error, _change, context) => {
      queryClient.setQueryData(WIFI_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: WIFI_QUERY_KEY }),
  });
}

export interface GuestChange {
  enabled: boolean;
  offHours: number;
}

export function useSetWifiAutoOff() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seconds: number) => setWifiAutoOff(client, seconds),
    onMutate: (seconds) =>
      optimistic(queryClient, (old) => ({ ...old, autoOffSeconds: seconds }))(),
    onError: (_error, _seconds, context) => {
      queryClient.setQueryData(WIFI_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: WIFI_QUERY_KEY }),
  });
}
