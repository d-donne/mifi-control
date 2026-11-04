import { getCurrentPlmn, getDevice, getMonitoring } from "@/src/api/routes";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";

export const STATUS_QUERY_KEY = ["status"] as const;
export const TRAFFIC_QUERY_KEY = ["traffic"] as const;
export const DEVICE_INFO_QUERY_KEY = ["device"] as const;
export const PLMN_QUERY_KEY = ["plmn"] as const;

export function useStatus() {
  return useHiLinkQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8_000,
  });
}

export function useTraffic() {
  return useHiLinkQuery({
    queryKey: TRAFFIC_QUERY_KEY,
    queryFn: (client) => getMonitoring(client, "traffic-statistics"),
    refetchInterval: 2_000,
  });
}

export function useDeviceInfo() {
  return useHiLinkQuery({
    queryKey: DEVICE_INFO_QUERY_KEY,
    queryFn: (client) => getDevice(client, "information"),
    refetchInterval: 60_000,
  });
}

export function usePlmn() {
  return useHiLinkQuery({
    queryKey: PLMN_QUERY_KEY,
    queryFn: getCurrentPlmn,
    refetchInterval: 60_000,
  });
}
