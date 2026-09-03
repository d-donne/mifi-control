/**
 * Response shape for GET /api/monitoring/status on the E5576-320.
 * Fields typed per actual device response (firmware 11.0.1.1 (H697SP11C00)).
 * The index signature at the end allows the device to add fields in future
 * firmware without breaking compilation.
 *
 * Salamek/huawei-lte-api does not export a typed schema for this endpoint —
 * they return a free-form dict (their `GetResponseType`). Our types are
 * the source of truth for the E5576-320 family.
 *
 * Status code values (from live testing and Salamek enums/client.py):
 *   ConnectionStatus:  901 = connected (LTE/data), 902 = connecting,
 *                      900 = disconnected, other = device-specific
 *   ServiceStatus:     2 = normal service
 *   SimStatus:         1 = SIM present
 *   WifiStatus:        1 = WiFi enabled
 *   CurrentNetworkTypeEx: 101 = 4G LTE (modern firmware), 19 = legacy 3G.
 *                      Prefer Ex; fall back to CurrentNetworkType on older
 *                      firmware that doesn't set the Ex field.
 *   SignalIcon:        0-5, 0 = no signal, 5 = full bars
 *   maxsignal:         Max possible SignalIcon value (always 5 on E5576-320)
 */
export interface MonitoringStatus {
  ConnectionStatus: number;
  WifiConnectionStatus: number;
  SignalStrength: string;
  SignalIcon: number;
  CurrentNetworkType: number;
  CurrentServiceDomain: number;
  RoamingStatus: number;
  BatteryStatus: number;
  BatteryLevel: number;
  BatteryPercent: number;
  simlockStatus: number;
  PrimaryDns: string;
  SecondaryDns: string;
  wififrequence: number;
  flymode: 0 | 1;
  PrimaryIPv6Dns: string;
  SecondaryIPv6Dns: string;
  CurrentWifiUser: number;
  TotalWifiUser: number;
  currenttotalwifiuser: number;
  ServiceStatus: number;
  SimStatus: number;
  WifiStatus: number;
  CurrentNetworkTypeEx: number;
  maxsignal: number;
  wifiindooronly: 0 | 1;
  WanPolicy: number;
  cellroam: 0 | 1;
  classify: string;
  usbup: 0 | 1;
  wifiswitchstatus: 0 | 1;
  WifiStatusExCustom: number;
  hvdcp_online: 0 | 1;
  speedLimitStatus: number;
  poorSignalStatus: number;
  [key: string]: unknown;
}
