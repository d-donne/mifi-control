import type { HiLinkClient } from "../main";
import type { DeviceInfo, DeviceInfoRaw } from "../types";

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
  // DeviceInfo is all strings — the raw wire object IS the typed shape.
  return res.response as DeviceEndpoints[K];
}

export async function reboot(client: HiLinkClient): Promise<void> {
  await client.requestAs("/api/device/control", {
    method: "POST",
    bodyObj: {
      Control: 1,
    },
  });
}
