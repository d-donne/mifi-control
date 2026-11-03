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
