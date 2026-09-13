import type { HiLinkClient } from "../main";

export async function setMobileData(
  client: HiLinkClient,
  enabled: boolean,
): Promise<void> {
  await client.requestAs("/api/dialup/mobile-dataswitch", {
    method: "POST",
    bodyObj: {
      dataswitch: enabled ? 1 : 0,
    },
  });
}
