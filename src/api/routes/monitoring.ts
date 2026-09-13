import type { HiLinkClient } from "../main";
import type {
  MonitoringStatus,
  MonitoringStatusRaw,
  TrafficStats,
  TrafficStatsRaw,
} from "../types";
import { flag, num } from "../utils";

export interface MonitoringEndpoints {
  status: MonitoringStatus;
  "traffic-statistics": TrafficStats;
}

/** Raw wire fields (parser returns strings — see parseTagValue: false). */
export interface MonitoringEndpointsRaw {
  status: MonitoringStatusRaw;
  "traffic-statistics": TrafficStatsRaw;
}

// Numeric fields of /api/monitoring/status (per types/monitoring.ts).
const STATUS_NUMERIC = new Set([
  "ConnectionStatus",
  "WifiConnectionStatus",
  "SignalIcon",
  "CurrentNetworkType",
  "CurrentServiceDomain",
  "RoamingStatus",
  "BatteryStatus",
  "BatteryLevel",
  "BatteryPercent",
  "simlockStatus",
  "wififrequence",
  "CurrentWifiUser",
  "TotalWifiUser",
  "currenttotalwifiuser",
  "ServiceStatus",
  "SimStatus",
  "WifiStatus",
  "CurrentNetworkTypeEx",
  "maxsignal",
  "WanPolicy",
  "WifiStatusExCustom",
  "speedLimitStatus",
  "poorSignalStatus",
]);

// 0|1 flag fields of /api/monitoring/status.
const STATUS_FLAG = new Set([
  "flymode",
  "wifiindooronly",
  "cellroam",
  "usbup",
  "wifiswitchstatus",
  "hvdcp_online",
]);

// Numeric fields of /api/monitoring/traffic-statistics.
const TRAFFIC_NUMERIC = new Set([
  "CurrentDownload",
  "CurrentUpload",
  "CurrentDownloadRate",
  "CurrentUploadRate",
  "TotalDownload",
  "TotalUpload",
  "TotalConnectTime",
]);

// 0|1 flag fields of /api/monitoring/traffic-statistics.
const TRAFFIC_FLAG = new Set(["showtraffic"]);

function coerceFields<TRaw extends Record<string, string>>(
  raw: TRaw,
  numeric: Set<string>,
  flags: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (flags.has(key)) out[key] = flag(value);
    else if (numeric.has(key)) out[key] = num(value);
    else out[key] = value;
  }
  return out;
}

export async function getMonitoring<K extends keyof MonitoringEndpoints>(
  client: HiLinkClient,
  endpoint: K,
): Promise<MonitoringEndpoints[K]> {
  const res = await client.requestAs<{
    response: MonitoringEndpointsRaw[K];
  }>(`/api/monitoring/${endpoint}`);

  // Coerce the raw wire object per endpoint before it crosses into typed
  // land. The branch is on a compile-time-known key, so it never misses.
  switch (endpoint) {
    case "status":
      return coerceFields(
        res.response,
        STATUS_NUMERIC,
        STATUS_FLAG,
      ) as MonitoringEndpoints[K];
    case "traffic-statistics":
      return coerceFields(
        res.response,
        TRAFFIC_NUMERIC,
        TRAFFIC_FLAG,
      ) as MonitoringEndpoints[K];
  }
}
