import type { HiLinkClient } from "../main";
import type {
  DataPlan,
  DataPlanRaw,
  MonitoringStatus,
  MonitoringStatusRaw,
  MonthStatistics,
  MonthStatisticsRaw,
  TrafficStats,
  TrafficStatsRaw,
} from "../types";
import { flag, num } from "../utils";

export interface MonitoringEndpoints {
  status: MonitoringStatus;
  "traffic-statistics": TrafficStats;
  month_statistics: MonthStatistics;
  start_date: DataPlan;
}

/** Raw wire fields (parser returns strings — see parseTagValue: false). */
export interface MonitoringEndpointsRaw {
  status: MonitoringStatusRaw;
  "traffic-statistics": TrafficStatsRaw;
  month_statistics: MonthStatisticsRaw;
  start_date: DataPlanRaw;
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

const COERCION: Record<
  keyof MonitoringEndpoints,
  { numeric: Set<string>; flags: Set<string> }
> = {
  status: { numeric: STATUS_NUMERIC, flags: STATUS_FLAG },
  "traffic-statistics": { numeric: TRAFFIC_NUMERIC, flags: TRAFFIC_FLAG },
  month_statistics: {
    numeric: new Set([
      "CurrentMonthDownload",
      "CurrentMonthUpload",
      "MonthDuration",
      "CurrentDayUsed",
      "CurrentDayDuration",
    ]),
    flags: new Set(),
  },
  start_date: {
    numeric: new Set([
      "StartDay",
      "DataLimitAwoke",
      "MonthThreshold",
      "DayThreshold",
      "trafficmaxlimit",
    ]),
    flags: new Set([
      "SetMonthData",
      "turnoffdataenable",
      "turnoffdataswitch",
      "turnoffdataflag",
    ]),
  },
};

function coerceFields(
  raw: Record<string, string>,
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

  const { numeric, flags } = COERCION[endpoint];
  return coerceFields(res.response, numeric, flags) as MonitoringEndpoints[K];
}

/**
 * POST /api/monitoring/start_date. Field order follows Salamek's
 * `set_start_date` (Huawei bodies are order-sensitive).
 * `enabled: false` sends SetMonthData=0 — not yet verified on-device.
 */
export async function setDataPlan(
  client: HiLinkClient,
  plan: {
    startDay: number;
    /** Number plus unit, e.g. "20GB" or "500MB". */
    dataLimit: string;
    monthThreshold: number;
    enabled: boolean;
  },
): Promise<void> {
  await client.requestAs("/api/monitoring/start_date", {
    method: "POST",
    bodyObj: {
      StartDay: plan.startDay,
      DataLimit: plan.dataLimit,
      MonthThreshold: plan.monthThreshold,
      SetMonthData: plan.enabled ? 1 : 0,
    },
  });
}
