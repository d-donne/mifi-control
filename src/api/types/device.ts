/**
 * Response shape for GET /api/device/information.
 * Field types confirmed against the E5576-320 actual response.
 */
export interface DeviceInfo {
  DeviceName: string;
  SerialNumber: string;
  Imei: string;
  Imsi: string;
  Iccid: string;
  Msisdn: string;
  HardwareVersion: string;
  SoftwareVersion: string;
  WebUIVersion: string;
  MacAddress1: string;
  MacAddress2: string;
  ProductFamily: string;
  Classify: string;
  supportmode: string;
  workmode: string;
  [key: string]: unknown;
}
