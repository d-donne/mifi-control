import type { HiLinkClient } from "../main";
import type { MonitoringStatus, TrafficStats } from "../types";

export interface MonitoringEndpoints {
  status: MonitoringStatus;
  "traffic-statistics": TrafficStats;
}

export async function getMonitoring<K extends keyof MonitoringEndpoints>(
  client: HiLinkClient,
  endpoint: K,
): Promise<MonitoringEndpoints[K]> {
  const res = await client.requestAs<{ response: MonitoringEndpoints[K] }>(
    `/api/monitoring/${endpoint}`,
  );
  return res.response;
}
