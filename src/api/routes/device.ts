import type { HiLinkClient } from "../main";
import type { DeviceInfo, DeviceInfoRaw } from "../types";
import { decodeHtmlEntities, str } from "../utils";

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

export async function reboot(client: HiLinkClient): Promise<void> {
  await client.requestAs("/api/device/control", {
    method: "POST",
    bodyObj: {
      Control: 1,
    },
  });
}
