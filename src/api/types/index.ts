export interface SessionTokenResponse {
  response: {
    SesInfo: string;
    TokInfo: string;
  };
}

export interface DeviceErrorResponse {
  error: {
    code: number | string;
    message?: string;
  };
}

export interface MonitoringStatus {
  ConnectionStatus: string;
  SignalIcon: string;
  CurrentNetworkTypeEx: string;
  [key: string]: unknown;
}

export interface TrafficStats {
  CurrentDownload: string;
  CurrentUpload: string;
  TotalDownload: string;
  TotalUpload: string;
  [key: string]: unknown;
}

export interface DeviceInfo {
  DeviceName: string;
  SerialNumber: string;
  Imei: string;
  HardwareVersion: string;
  SoftwareVersion: string;
  [key: string]: unknown;
}
