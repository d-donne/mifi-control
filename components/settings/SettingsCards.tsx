import {
  ChevronRight,
  CircleCheck,
  Globe,
  Palette,
  Plane,
  Signal,
  Smartphone,
  Wifi,
  type LucideIcon,
} from "@/components/icons";
import { MODE_LABELS } from "@/components/settings/MobileNetworkRows";
import { useWifiSummary } from "@/components/settings/WifiRows";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { describePlan } from "@/src/api/utils";
import { paletteColors, useAppColors } from "@/src/hooks/useAppColors";
import { useAppUpdate } from "@/src/hooks/useAppUpdate";
import { useDataPlan } from "@/src/hooks/useDataUsage";
import { usePlmn, useStatus } from "@/src/hooks/useDeviceStatus";
import {
  useDataRoaming,
  useMobileData,
  useNetworkMode,
  useSetDataRoaming,
  useSetMobileData,
} from "@/src/hooks/useMifiControls";
import { usePalette } from "@/src/hooks/usePalette";
import { PALETTE_IDS, PALETTES, type PaletteId } from "@/src/theme/palettes";
import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator } from "react-native";

function GroupCard({
  icon: Icon,
  title,
  summary,
  href,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary?: string;
  href: Href;
  children?: ReactNode;
}) {
  const colors = useAppColors();
  const router = useRouter();
  return (
    <VStack className="overflow-hidden rounded-3xl bg-card">
      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={summary ? `${title}, ${summary}` : title}
        accessibilityHint={`Opens all ${title.toLowerCase()} settings`}
        className="flex-row items-center gap-3 px-4 py-3 data-[active=true]:opacity-70"
      >
        <Box className="h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
          <Icon size={18} color={colors.primary} strokeWidth={1.9} />
        </Box>
        <VStack className="flex-1">
          <Text className="text-[15px] font-semibold text-foreground">
            {title}
          </Text>
          {summary && (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {summary}
            </Text>
          )}
        </VStack>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
      {children && <Box className="px-3 pb-3">{children}</Box>}
    </VStack>
  );
}

function QuickToggle({
  icon: Icon,
  label,
  on,
  state,
  busy,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  on: boolean | undefined;
  state?: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const active = on === true;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy || on === undefined}
      accessibilityRole="switch"
      accessibilityState={{ checked: active, busy }}
      accessibilityLabel={label}
      className={`flex-1 flex-row items-center gap-2.5 rounded-2xl px-3 py-2.5 data-[active=true]:opacity-80 ${active ? "bg-primary/15" : "bg-secondary"}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon
          size={18}
          color={active ? colors.primary : colors.mutedForeground}
          strokeWidth={1.9}
        />
      )}
      <VStack className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {label}
        </Text>
        <Text
          className={`text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {state ?? (on === undefined ? "—" : active ? "On" : "Off")}
        </Text>
      </VStack>
    </Pressable>
  );
}

export function NetworkCard() {
  const { data: plmn } = usePlmn();
  const { data: network } = useNetworkMode();
  const { data: plan } = useDataPlan();
  const { data: mobileData } = useMobileData();
  const setMobileData = useSetMobileData();
  const { data: roaming } = useDataRoaming();
  const setRoaming = useSetDataRoaming();

  const summary = [
    plmn?.FullName,
    network ? MODE_LABELS[network.mode] : undefined,
    describePlan(plan) === "Not set" ? undefined : describePlan(plan),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <GroupCard
      icon={Signal}
      title="Mobile network"
      summary={summary || undefined}
      href="/settings/network"
    >
      <HStack className="gap-2">
        <QuickToggle
          icon={Globe}
          label="Mobile data"
          on={mobileData}
          busy={setMobileData.isPending}
          onPress={() => setMobileData.mutate(!mobileData)}
        />
        <QuickToggle
          icon={Plane}
          label="Roaming"
          on={roaming}
          busy={setRoaming.isPending}
          onPress={() => setRoaming.mutate(!roaming)}
        />
      </HStack>
    </GroupCard>
  );
}

export function WifiCard() {
  const { data: status } = useStatus();
  const { main } = useWifiSummary();

  const summary = [
    main?.name,
    status
      ? `${status.CurrentWifiUser} of ${status.TotalWifiUser} devices`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <GroupCard
      icon={Wifi}
      title="Wi-Fi"
      summary={summary || undefined}
      href="/settings/wifi"
    />
  );
}

function PaletteSwatch({ id }: { id: PaletteId }) {
  const colors = useAppColors();
  const selected = usePalette((s) => s.palette === id);
  const setPalette = usePalette((s) => s.setPalette);
  const own = paletteColors(id, "dark");

  return (
    <Pressable
      onPress={() => setPalette(id)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={PALETTES[id].name}
      className="flex-1 rounded-2xl border-2 p-1"
      style={{ borderColor: selected ? colors.primary : "transparent" }}
    >
      <Box
        className="h-11 justify-between rounded-lg p-2"
        style={{ backgroundColor: own.hero }}
      >
        <HStack className="items-center justify-between">
          <Box
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: own.onlineDot }}
          />
          {selected && <CircleCheck size={13} color={own.heroForeground} />}
        </HStack>
        <HStack className="gap-1">
          <Box
            className="h-1.5 w-5 rounded-full"
            style={{ backgroundColor: own.primary }}
          />
          <Box
            className="h-1.5 w-2 rounded-full"
            style={{ backgroundColor: own.dataRingUpload }}
          />
        </HStack>
      </Box>
    </Pressable>
  );
}

export function AppearanceCard() {
  const palette = usePalette((s) => s.palette);
  return (
    <GroupCard
      icon={Palette}
      title="Appearance"
      summary={PALETTES[palette].name}
      href="/settings/appearance"
    >
      <HStack className="gap-1" accessibilityRole="radiogroup">
        {PALETTE_IDS.map((id) => (
          <PaletteSwatch key={id} id={id} />
        ))}
      </HStack>
    </GroupCard>
  );
}

export function AppCard() {
  const colors = useAppColors();
  const update = useAppUpdate();
  const version = `Version ${Constants.expoConfig?.version ?? "—"}`;

  return (
    <GroupCard
      icon={Smartphone}
      title="App"
      summary={`${version} · ${update.status}`}
      href="/settings/app"
    >
      {update.available && (
        <Pressable
          onPress={() => void update.run()}
          disabled={update.busy}
          accessibilityRole="button"
          className={`flex-row items-center justify-center gap-2 rounded-2xl py-3 data-[active=true]:opacity-80 ${update.ready ? "bg-primary" : "bg-secondary"}`}
        >
          {update.busy && (
            <ActivityIndicator size="small" color={colors.foreground} />
          )}
          <Text
            className={`text-sm font-medium ${update.ready ? "text-primary-foreground" : "text-foreground"}`}
          >
            {update.action}
          </Text>
        </Pressable>
      )}
    </GroupCard>
  );
}
