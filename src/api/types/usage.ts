/**
 * GET /api/monitoring/month_statistics — usage for the current billing
 * cycle. Bytes and seconds. Field set observed on the E5576-320
 * (see p-docs/webui-endpoints.md).
 */
export interface MonthStatistics {
  CurrentMonthDownload: number;
  CurrentMonthUpload: number;
  MonthDuration: number;
  /** Cycle start, "YYYY-MM-DD". */
  MonthLastClearTime: string;
  /** Bytes today, download + upload. */
  CurrentDayUsed: number;
  CurrentDayDuration: number;
  [key: string]: unknown;
}

export type MonthStatisticsRaw = Record<string, string>;

/**
 * GET/POST /api/monitoring/start_date — the monthly data plan.
 * `SetMonthData` is 0 until a plan is configured; `DataLimit` is a number
 * plus unit, e.g. "0MB" or "20GB".
 */
export interface DataPlan {
  StartDay: number;
  DataLimit: string;
  DataLimitAwoke: number;
  MonthThreshold: number;
  DayThreshold: number;
  SetMonthData: 0 | 1;
  trafficmaxlimit: number;
  turnoffdataenable: 0 | 1;
  turnoffdataswitch: 0 | 1;
  turnoffdataflag: 0 | 1;
  [key: string]: unknown;
}

export type DataPlanRaw = Record<string, string>;
