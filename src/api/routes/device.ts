import type { HiLinkClient } from "../main";
import type { DeviceInfo, DeviceInfoRaw, DeviceSignal } from "../types";
import { decodeHtmlEntities, num, str } from "../utils";

export interface DeviceEndpoints {
  information: DeviceInfo;
}

/** Raw wire fields (parser returns strings — see parseTagValue: false). */
export interface DeviceEndpointsRaw {
  information: DeviceInfoRaw;
}

export async function getDevice<K extends keyof DeviceEndpoints>(
  client: HiLinkClient,
  endpoint: K,
): Promise<DeviceEndpoints[K]> {
  const res = await client.requestAs<{
    response: DeviceEndpointsRaw[K];
  }>(`/api/device/${endpoint}`);
  // The device escapes text fields, e.g. SoftwareVersion "11.0.1.1&#40;…&#41;".
  const decoded = Object.fromEntries(
    Object.entries(res.response).map(([key, value]) => [
      key,
      decodeHtmlEntities(str(value)),
    ]),
  );
  return decoded as DeviceEndpoints[K];
}

/** `Control: 4`; 2 is a factory reset and must never be sent. */
export async function powerOff(client: HiLinkClient): Promise<void> {
  await client.requestAs("/api/device/control", {
    method: "POST",
    bodyObj: { Control: 4 },
  });
}

export async function reboot(client: HiLinkClient): Promise<void> {
  await client.requestAs("/api/device/control", {
    method: "POST",
    bodyObj: {
      Control: 1,
    },
  });
}

// Some firmware caps readings as ">=-44dBm"; take the first number.
function measure(value: unknown): number | null {
  const match = /-?\d+(\.\d+)?/.exec(str(value));
  return match ? Number(match[0]) : null;
}

export async function getSignal(client: HiLinkClient): Promise<DeviceSignal> {
  const { response: raw } = await client.requestAs<{
    response: Record<string, string>;
  }>("/api/device/signal");
  return {
    mode: num(raw.mode, -1),
    rsrp: measure(raw.rsrp),
    rsrq: measure(raw.rsrq),
    sinr: measure(raw.sinr),
    band: measure(raw.band),
    dlBandwidth: str(raw.dlbandwidth),
    cellId: str(raw.cell_id),
    pci: str(raw.pci),
  };
}
