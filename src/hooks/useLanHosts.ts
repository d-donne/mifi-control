import { getLanHosts } from "@/src/api/routes";
import type { HiLinkClient } from "@/src/api/main";
import type { LanHost } from "@/src/api/types";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";

export const HOSTS_QUERY_KEY = ["hosts"] as const;

// The MiFi keeps listing a removed device for a while after answering OK, so
// every fetch hides it until the device drops it or this times out.
const FORGET_HIDE_MS = 60_000;
const forgotten = new Map<string, number>();

export function hideForgottenHost(mac: string): void {
  forgotten.set(mac.toUpperCase(), Date.now() + FORGET_HIDE_MS);
}

export function showForgottenHost(mac: string): void {
  forgotten.delete(mac.toUpperCase());
}

export function withoutForgotten(hosts: LanHost[]): LanHost[] {
  const now = Date.now();
  for (const [mac, until] of forgotten) {
    if (until < now) forgotten.delete(mac);
  }
  return hosts.filter((h) => !forgotten.has(h.MacAddress.toUpperCase()));
}

async function fetchHosts(client: HiLinkClient): Promise<LanHost[]> {
  const hosts = await getLanHosts(client);
  const listed = new Set(hosts.map((h) => h.MacAddress.toUpperCase()));
  for (const mac of forgotten.keys()) {
    if (!listed.has(mac)) forgotten.delete(mac);
  }
  return withoutForgotten(hosts);
}

export function useLanHosts() {
  return useHiLinkQuery({
    queryKey: HOSTS_QUERY_KEY,
    queryFn: fetchHosts,
    refetchInterval: 30_000,
  });
}
