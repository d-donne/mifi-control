import type { LanHost } from "@/src/api/types";
import {
  Cable,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Tv,
} from "lucide-react-native";

const MAC_LIKE = /^([0-9a-f]{2}[-:]){5}[0-9a-f]{2}$/i;

type DeviceKind = "phone" | "tablet" | "computer" | "tv" | "wired" | "other";

const KIND_RULES: [RegExp, DeviceKind][] = [
  [/ipad|\btab\b|tablet/i, "tablet"],
  [/macbook|laptop|thinkpad|desktop-|-pc\b|\bpc\b|windows/i, "computer"],
  [/\btv\b|chromecast|roku|fire-?tv|bravia/i, "tv"],
  [
    /iphone|android|galaxy|redmi|xiaomi|poco|tecno|infinix|itel|pixel|oneplus|oppo|vivo|realme|nokia|samsung|huawei|honor|phone/i,
    "phone",
  ],
];

/** The MiFi falls back to the MAC as the name when a device sends none. */
export function isUnnamed(host: LanHost): boolean {
  return MAC_LIKE.test(host.ActualName || host.HostName);
}

export function displayName(host: LanHost): string {
  return isUnnamed(host) ? "Unnamed device" : host.ActualName || host.HostName;
}

export function byDisplayName(a: LanHost, b: LanHost): number {
  return (
    Number(isUnnamed(a)) - Number(isUnnamed(b)) ||
    displayName(a).localeCompare(displayName(b))
  );
}

function deviceKind(host: LanHost): DeviceKind {
  if (host.isLocalDevice === 1) return "phone";
  const names = `${host.ActualName} ${host.HostName}`;
  const match = KIND_RULES.find(([pattern]) => pattern.test(names));
  if (match) return match[1];
  return host.InterfaceType === "Ethernet" ? "wired" : "other";
}

export function DeviceIcon({
  host,
  size,
  color,
}: {
  host: LanHost;
  size: number;
  color: string;
}) {
  switch (deviceKind(host)) {
    case "phone":
      return <Smartphone size={size} color={color} />;
    case "tablet":
      return <Tablet size={size} color={color} />;
    case "computer":
      return <Laptop size={size} color={color} />;
    case "tv":
      return <Tv size={size} color={color} />;
    case "wired":
      return <Cable size={size} color={color} />;
    default:
      return <MonitorSmartphone size={size} color={color} />;
  }
}
