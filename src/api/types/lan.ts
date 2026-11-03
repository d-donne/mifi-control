/**
 * One entry of GET /api/lan/HostInfo. The list includes devices seen
 * earlier; `Active` marks the ones connected now.
 */
export interface LanHost {
  ID: string;
  HostName: string;
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
