import type { HiLinkClient } from "../main";
import type { CurrentPlmn, CurrentPlmnRaw } from "../types";
import { num, str } from "../utils";

export async function getCurrentPlmn(
  client: HiLinkClient,
): Promise<CurrentPlmn> {
  const { response: raw } = await client.requestAs<{
    response: CurrentPlmnRaw;
  }>("/api/net/current-plmn");
  return {
    ...raw,
    State: num(raw.State),
    FullName: str(raw.FullName),
    ShortName: str(raw.ShortName),
    Numeric: str(raw.Numeric),
    Rat: num(raw.Rat),
    Spn: str(raw.Spn),
  };
}

export interface NetworkMode {
  /** "00" auto, "01" 2G only, "02" 3G only, "03" 4G only. */
  mode: string;
  /** Modes this device offers, from net-mode-list. */
  available: string[];
}

async function getNetModeRaw(client: HiLinkClient) {
  const { response } = await client.requestAs<{
    response: { NetworkMode: string; NetworkBand: string; LTEBand: string };
  }>("/api/net/net-mode");
  return response;
}

export async function getNetworkMode(
  client: HiLinkClient,
): Promise<NetworkMode> {
  const current = await getNetModeRaw(client);
  const { response: list } = await client.requestAs<{
    response: { AccessList?: { Access?: string | string[] } };
  }>("/api/net/net-mode-list");
  const access = list.AccessList?.Access ?? [];
  return {
    mode: str(current.NetworkMode),
    available: (Array.isArray(access) ? access : [access]).map(str),
  };
}

/** Bands are sent back unchanged; the field order follows Salamek's set_net_mode. */
export async function setNetworkMode(
  client: HiLinkClient,
  mode: string,
): Promise<void> {
  const current = await getNetModeRaw(client);
  await client.requestAs("/api/net/net-mode", {
    method: "POST",
    bodyObj: {
      NetworkMode: mode,
      NetworkBand: str(current.NetworkBand),
      LTEBand: str(current.LTEBand),
    },
  });
}
