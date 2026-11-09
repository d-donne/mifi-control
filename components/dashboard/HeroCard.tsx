import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import PulsingDot from "../common/PulsingDot";
import {
  useDeviceInfo,
  usePlmn,
  useStatus,
  useTraffic,
} from "@/src/hooks/useDeviceStatus";
import {
  countryFromPlmn,
  formatDuration,
  formatNetRate,
  isOnline,
  networkLabel,
  num,
} from "@/src/api/utils";
import { useAppColors, withAlpha } from "@/src/hooks/useAppColors";
import { usePalette } from "@/src/hooks/usePalette";
import { PALETTES } from "@/src/theme/palettes";
import { useRouter } from "expo-router";
import useSignalConfig from "./SignalConfig";
import SignalBars from "./SignalBars";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

function Weave() {
  const palette = usePalette((s) => s.palette);
  const colors = useAppColors("dark");
  return (
    <Box className="absolute right-0 bottom-0 left-0 h-1 flex-row">
      {PALETTES[palette].weave.map((band, i) => (
        <Box
          key={i}
          style={{ flex: band.width, backgroundColor: colors[band.color] }}
        />
      ))}
    </Box>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <VStack className="flex-1">
      <Text className="text-xs text-hero-muted">{label}</Text>
      <Text
        className="text-base font-semibold text-hero-foreground"
        style={TABULAR}
      >
        {value}
      </Text>
    </VStack>
  );
}

export default function HeroCard() {
  const { data: device } = useDeviceInfo();
  const { data: status } = useStatus();
  const { data: traffic } = useTraffic();
  const { data: plmn } = usePlmn();
  // The panel keeps its dark colour in both themes, so its inks come from the dark scheme.
  const colors = useAppColors("dark");
  const router = useRouter();
  const signal = useSignalConfig(status?.SignalIcon, "dark");
  const barColor = signal.level >= 3 ? colors.accent : signal.color;

  const online = isOnline(status?.ConnectionStatus);
  const name = plmn?.FullName || plmn?.ShortName;
  const country = countryFromPlmn(plmn?.Numeric);
  const carrier = name ? (country ? `${name} · ${country}` : name) : "—";

  return (
    <Box className="overflow-hidden rounded-2xl bg-hero px-5 pt-4 pb-6">
      <HStack className="items-center justify-between">
        <HStack space="sm" className="items-center">
          <PulsingDot isOnline={online} colorClass="bg-online-dot" />
          <Text className="text-sm font-semibold text-hero-foreground">
            {status ? (online ? "Online" : "Offline") : "Connecting"}
          </Text>
        </HStack>
        <Text className="text-sm text-hero-muted" numberOfLines={1}>
          {device?.DeviceName ?? ""}
        </Text>
      </HStack>

      <HStack className="mt-3 items-end justify-between">
        <VStack>
          <Text className="text-5xl leading-[56px] font-bold text-hero-foreground">
            {networkLabel(status?.CurrentNetworkTypeEx)}
          </Text>
          <Text className="text-base font-semibold text-hero-foreground">
            {carrier}
          </Text>
        </VStack>
        <Pressable
          onPress={() => router.push("/signal")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Signal ${signal.text}. Shows signal details`}
          className="items-end gap-2 pb-0.5 data-[active=true]:opacity-70"
        >
          <SignalBars
            level={signal.level}
            color={barColor}
            emptyColor={withAlpha(colors.heroForeground, 0.18)}
          />
          <Text className="text-sm text-hero-muted">{signal.text}</Text>
        </Pressable>
      </HStack>

      <Box className="my-4 h-px bg-hero-muted/25" />

      <HStack>
        <Reading
          label="Download"
          value={formatNetRate(traffic?.CurrentDownloadRate)}
        />
        <Reading
          label="Upload"
          value={formatNetRate(traffic?.CurrentUploadRate)}
        />
        <Reading
          label="Uptime"
          value={device ? formatDuration(num(device.uptime)) : "—"}
        />
      </HStack>
      <Weave />
    </Box>
  );
}
