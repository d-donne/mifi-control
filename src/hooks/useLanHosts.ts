import { getLanHosts } from "@/src/api/routes";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";

export const HOSTS_QUERY_KEY = ["hosts"] as const;

export function useLanHosts() {
  return useHiLinkQuery({
    queryKey: HOSTS_QUERY_KEY,
    queryFn: getLanHosts,
    refetchInterval: 30_000,
  });
}
