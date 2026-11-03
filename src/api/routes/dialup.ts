import type { HiLinkClient } from "../main";
import { flag } from "../utils";

export async function getMobileData(client: HiLinkClient): Promise<boolean> {
  const { response } = await client.requestAs<{
    response: { dataswitch?: string };
  }>("/api/dialup/mobile-dataswitch");
  return flag(response.dataswitch) === 1;
}

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
