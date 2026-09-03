/**
 * Response shape for GET /api/monitoring/traffic-statistics.
 * Field types confirmed against the E5576-320 actual response; exact field
 * names per Salamek/huawei-lte-api's `Monitoring.traffic_statistics`.
 * All byte counts and rates are sent as integers (bytes and bytes/sec).
 */
export interface TrafficStats {
  CurrentDownload: number;
  CurrentUpload: number;
  CurrentDownloadRate: number;
  CurrentUploadRate: number;
  TotalDownload: number;
  TotalUpload: number;
  TotalConnectTime: number;
  showtraffic: 0 | 1;
  [key: string]: unknown;
}
