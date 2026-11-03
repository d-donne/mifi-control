/** One entry of the Wi-Fi MAC blacklist. */
export interface BlockedDevice {
  /** Upper-case, colon-separated, as the device stores it. */
  mac: string;
  name: string;
}

/**
 * GET /api/wlan/multi-macfilter-settings-ex, primary SSID (Index 0) only.
 * `status`: 0 off, 1 allow-list (whitelist), 2 block-list (blacklist).
 */
export interface MacFilter {
  supported: boolean;
  status: 0 | 1 | 2;
  blocked: BlockedDevice[];
}

/** Numbered `WifiMacFilterMac{n}` / `wifihostname{n}` pairs, in any order. */
export type MacFilterListRaw = Record<string, string> | "";

export interface MacFilterSsidRaw {
  Index?: string;
  wifimacblacklist?: MacFilterListRaw;
  wifimacwhitelist?: MacFilterListRaw;
}

export interface RawMacFilterResponse {
  enable?: string;
  wifimacfilterstatus?: string;
  Ssids?: { Ssid?: MacFilterSsidRaw | MacFilterSsidRaw[] } | "";
}
