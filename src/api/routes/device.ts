import type { HiLinkClient } from "../main";
import type { DeviceInfo } from "../types";

export interface DeviceEndpoints {
  information: DeviceInfo;
}

export async function getDevice<K extends keyof DeviceEndpoints>(
  client: HiLinkClient,
  endpoint: K,
): Promise<DeviceEndpoints[K]> {
  const res = await client.requestAs<{ response: DeviceEndpoints[K] }>(
    `/api/device/${endpoint}`,
  );
  return res.response;
}

export async function reboot(client: HiLinkClient): Promise<void> {
  await client.requestAs("/api/device/control", {
    method: "POST",
    bodyObj: {
      Control: 1,
    },
  });
}
