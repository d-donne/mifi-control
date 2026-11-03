/**
 * One entry of GET /api/lan/HostInfo. The list includes devices seen
 * earlier; `Active` marks the ones connected now.
 */
export interface LanHost {
  /** "InternetGatewayDevice.LANDevice.1.Hosts.Host.5."; lan/changedevicename takes it. */
  ID: string;
  /** Name the device reports. */
  HostName: string;
  /** Name set in the web UI; equals HostName until renamed. */
  ActualName: string;
  /** "IPv4" or "IPv4;IPv6". */
  IpAddress: string;
  MacAddress: string;
  Active: 0 | 1;
  /** 1 for the device making the request (this phone). */
  isLocalDevice: 0 | 1;
  /** "Wireless" or "Ethernet". */
  InterfaceType: string;
  AddressSource: string;
  AssociatedSsid: string;
  /** Seconds connected; 0 when not connected. */
  AssociatedTime: number;
  LeaseTime: number;
}

export type LanHostRaw = Record<string, string>;

export interface RawHostInfoResponse {
  Hosts?: { Host?: LanHostRaw | LanHostRaw[] } | "";
}
