import { HiLinkError } from "../errors";
import type { HiLinkClient } from "../main";
import type {
  BlockedDevice,
  LanHost,
  MacFilter,
  MacFilterListRaw,
  RawMacFilterResponse,
} from "../types";
import { decodeHtmlEntities, num, str } from "../utils";

const PRIMARY_SSID = "0";
const BLOCKLIST_MODE = 2;
const ALLOWLIST_MODE = 1;
/** `wifimaxmacfilternum` in wlan/wifi-feature-switch on the E5576-320. */
export const MAX_BLOCKED_DEVICES = 32;

function parseFilterList(list: MacFilterListRaw | undefined): BlockedDevice[] {
  if (!list) return [];
  const entries: (BlockedDevice & { slot: number })[] = [];
  for (const [key, value] of Object.entries(list)) {
    const slot = /^WifiMacFilterMac(\d+)$/.exec(key)?.[1];
    const mac = str(value).toUpperCase();
    if (slot === undefined || mac === "") continue;
    entries.push({
      slot: Number(slot),
      mac,
      name: decodeHtmlEntities(str(list[`wifihostname${slot}`])),
    });
  }
  return entries
    .sort((a, b) => a.slot - b.slot)
    .map(({ mac, name }) => ({ mac, name }));
}

export async function getMacFilter(client: HiLinkClient): Promise<MacFilter> {
  const { response } = await client.requestAs<{
    response: RawMacFilterResponse;
  }>("/api/wlan/multi-macfilter-settings-ex");
  const ssid = response.Ssids ? response.Ssids.Ssid : undefined;
  const ssids = ssid === undefined ? [] : Array.isArray(ssid) ? ssid : [ssid];
  const primary = ssids.find((s) => str(s.Index) === PRIMARY_SSID);
  const status = num(response.wifimacfilterstatus);
  return {
    supported: str(response.enable) === "1",
    status: status === 1 || status === 2 ? status : 0,
    blocked: parseFilterList(primary?.wifimacblacklist),
  };
}

/**
 * Rewrites the primary SSID's block list; the device replaces the whole
 * list. Slot numbers follow the GET (which is compacted); an emptied slot is
 * sent blank, as the web UI does when unblocking.
 */
async function writeBlockList(
  client: HiLinkClient,
  mode: MacFilter["status"],
  slots: BlockedDevice[],
): Promise<void> {
  const ssid: Record<string, string | number> = {
    Index: Number(PRIMARY_SSID),
    WifiMacFilterStatus: mode,
  };
  for (const [i, device] of slots.entries()) {
    ssid[`WifiMacFilterMac${i}`] = device.mac;
    ssid[`wifihostname${i}`] = device.name;
  }
  await client.requestAs("/api/wlan/multi-macfilter-settings", {
    method: "POST",
    bodyObj: { Ssids: { Ssid: ssid } },
  });
}

// In allow-list mode the request would replace the list of devices that may
// connect; a wrong write there disconnects everything, including this phone.
function assertWritable(filter: MacFilter): void {
  if (!filter.supported)
    throw new HiLinkError("This MiFi doesn't support blocking devices.");
  if (filter.status === ALLOWLIST_MODE)
    throw new HiLinkError(
      "The MiFi is in allow-list mode. Change it in the MiFi web page first.",
    );
}

export async function blockDevice(
  client: HiLinkClient,
  host: LanHost,
): Promise<void> {
  if (host.isLocalDevice === 1)
    throw new HiLinkError("You can't block the phone you're using.");
  const mac = host.MacAddress.toUpperCase();
  const filter = await getMacFilter(client);
  assertWritable(filter);
  if (filter.blocked.some((d) => d.mac === mac)) return;
  if (filter.blocked.length >= MAX_BLOCKED_DEVICES)
    throw new HiLinkError(
      `The MiFi can block at most ${MAX_BLOCKED_DEVICES} devices.`,
    );
  const name = host.ActualName || host.HostName;
  await writeBlockList(client, BLOCKLIST_MODE, [
    ...filter.blocked,
    { mac, name },
  ]);
}

export async function unblockDevice(
  client: HiLinkClient,
  mac: string,
): Promise<void> {
  const target = mac.toUpperCase();
  const filter = await getMacFilter(client);
  assertWritable(filter);
  if (!filter.blocked.some((d) => d.mac === target)) return;
  await writeBlockList(
    client,
    filter.status,
    filter.blocked.map((d) => (d.mac === target ? { mac: "", name: "" } : d)),
  );
}
