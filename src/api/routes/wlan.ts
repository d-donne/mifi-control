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

type WifiRecord = Record<string, string>;

// The web UI nulls these before saving and its serializer drops nulls, so the
// MiFi keeps the stored values. Sending them empty would change them.
const WIFI_SECRET_KEYS = new Set([
  "WifiSsid",
  "WifiRadiusKey",
  "WifiWpapsk",
  "MixWifiWpapsk",
  "WifiWepKey1",
  "WifiWepKey2",
  "WifiWepKey3",
  "WifiWepKey4",
  "WifiWep128Key1",
  "WifiWep128Key2",
  "WifiWep128Key3",
  "WifiWep128Key4",
]);

function asList<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Values come back HTML-escaped ("b&#x2F;g&#x2F;n"); write them back decoded.
function decodeRecord(record: WifiRecord): WifiRecord {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      decodeHtmlEntities(str(value)),
    ]),
  );
}

async function getBasicSsids(client: HiLinkClient): Promise<WifiRecord[]> {
  const { response } = await client.requestAs<{
    response: { Ssids?: { Ssid?: WifiRecord | WifiRecord[] } };
  }>("/api/wlan/multi-basic-settings");
  return asList(response.Ssids?.Ssid).map(decodeRecord);
}

async function getSecuritySsids(client: HiLinkClient): Promise<WifiRecord[]> {
  const { response } = await client.requestAs<{
    response: { ssids?: { ssid?: WifiRecord | WifiRecord[] } };
  }>("/api/wlan/multi-security-settings-ex");
  return asList(response.ssids?.ssid).map(decodeRecord);
}

export interface WifiNetwork {
  index: string;
  name: string;
  enabled: boolean;
  guest: boolean;
  /** "WPA2-PSK", "OPEN", … */
  security: string;
  /** Guest network turns itself off after this many hours; 0 = never. */
  guestOffHours: number;
}

export interface WifiSettings {
  networks: WifiNetwork[];
  /** Wi-Fi turns off after this long with no device connected; 0 = never. */
  autoOffSeconds: number;
}

export async function getWifiSettings(
  client: HiLinkClient,
): Promise<WifiSettings> {
  const basic = await getBasicSsids(client);
  const security = await getSecuritySsids(client);
  const main = security.find((s) => s.Index === "0") ?? security[0];
  return {
    networks: basic.map((s) => ({
      index: s.Index,
      name: s.WifiSsid,
      enabled: s.WifiEnable === "1",
      guest: s.wifiisguestnetwork === "1",
      security: s.WifiAuthmode,
      guestOffHours: num(s.wifiguestofftime),
    })),
    autoOffSeconds: main?.Wifioffenable === "1" ? num(main.Wifiofftime) : 0,
  };
}

/** Restarts Wi-Fi (`WifiRestart: 1`), as the web UI's guest page does. */
export async function setGuestWifi(
  client: HiLinkClient,
  enabled: boolean,
  offHours: number,
): Promise<void> {
  const basic = await getBasicSsids(client);
  if (!basic.some((s) => s.wifiisguestnetwork === "1")) {
    throw new HiLinkError("This MiFi has no guest network");
  }
  const Ssid = basic.map((s) => {
    const kept = Object.fromEntries(
      Object.entries(s).filter(([key]) => !WIFI_SECRET_KEYS.has(key)),
    );
    return s.wifiisguestnetwork === "1"
      ? {
          ...kept,
          WifiEnable: enabled ? "1" : "0",
          wifiguestofftime: String(offHours),
        }
      : kept;
  });
  await client.requestAs("/api/wlan/multi-basic-settings", {
    method: "POST",
    bodyObj: { Ssids: { Ssid }, WifiRestart: 1 },
  });
}

/** Saved without a Wi-Fi restart (`WifiRestart: 0`), as the web UI does. */
export async function setWifiAutoOff(
  client: HiLinkClient,
  seconds: number,
): Promise<void> {
  const ssid = (await getSecuritySsids(client)).map((s) => ({
    ...s,
    Wifioffenable: seconds > 0 ? "1" : "0",
    ...(seconds > 0 ? { Wifiofftime: String(seconds) } : {}),
  }));
  await client.requestAs("/api/wlan/multi-security-settings-ex", {
    method: "POST",
    bodyObj: { ssids: { ssid }, WifiRestart: 0 },
  });
}
