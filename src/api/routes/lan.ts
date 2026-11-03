import type { HiLinkClient } from "../main";
import type { LanHost, LanHostRaw, RawHostInfoResponse } from "../types";
import { decodeHtmlEntities, flag, num, str } from "../utils";

function normalizeHost(raw: LanHostRaw): LanHost {
  return {
    ID: str(raw.ID),
    HostName: decodeHtmlEntities(str(raw.HostName)),
    ActualName: decodeHtmlEntities(str(raw.ActualName)),
    IpAddress: str(raw.IpAddress),
    MacAddress: str(raw.MacAddress),
    Active: flag(raw.Active),
    isLocalDevice: flag(raw.isLocalDevice),
    InterfaceType: str(raw.InterfaceType),
    AddressSource: str(raw.AddressSource),
    AssociatedSsid: str(raw.AssociatedSsid),
    AssociatedTime: num(raw.AssociatedTime),
    LeaseTime: num(raw.LeaseTime),
  };
}

/** Every host the MiFi knows about; filter on `Active` for connected ones. */
export async function getLanHosts(client: HiLinkClient): Promise<LanHost[]> {
  const { response } = await client.requestAs<{
    response: RawHostInfoResponse;
  }>("/api/lan/HostInfo");
  const host = response.Hosts ? response.Hosts.Host : undefined;
  const list = host === undefined ? [] : Array.isArray(host) ? host : [host];
  return list.map(normalizeHost);
}

export async function renameDevice(
  client: HiLinkClient,
  id: string,
  name: string,
): Promise<void> {
  await client.requestAs("/api/lan/changedevicename", {
    method: "POST",
    bodyObj: { ID: id, ActualName: name },
  });
}

/** Splits "IPv4;IPv6" into its parts. */
export function splitHostAddresses(ipAddress: string): {
  ipv4: string | null;
  ipv6: string | null;
} {
  const parts = ipAddress.split(";").filter(Boolean);
  return {
    ipv4: parts.find((p) => !p.includes(":")) ?? null,
    ipv6: parts.find((p) => p.includes(":")) ?? null,
  };
}
