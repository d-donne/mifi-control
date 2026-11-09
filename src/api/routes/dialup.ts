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

async function getDialupConnection(
  client: HiLinkClient,
): Promise<Record<string, string>> {
  const { response } = await client.requestAs<{
    response: Record<string, string>;
  }>("/api/dialup/connection");
  return response;
}

export async function getDataRoaming(client: HiLinkClient): Promise<boolean> {
  const connection = await getDialupConnection(client);
  return flag(connection.RoamAutoConnectEnable) === 1;
}

/** The web UI posts the whole connection object back with one field changed. */
export async function setDataRoaming(
  client: HiLinkClient,
  enabled: boolean,
): Promise<void> {
  const connection = await getDialupConnection(client);
  await client.requestAs("/api/dialup/connection", {
    method: "POST",
    bodyObj: { ...connection, RoamAutoConnectEnable: enabled ? 1 : 0 },
  });
}
