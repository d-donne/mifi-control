import CircularProgress, {
  type RingSegment,
} from "@/components/common/CircularProgress";
import { TABULAR } from "@/components/dashboard/RingCard";
import {
  CardSim,
  ChevronDown,
  Router,
  SlidersHorizontal,
} from "@/components/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { SmsCount } from "@/src/api/types/sms";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useState, type ReactNode } from "react";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const WARN_RATIO = 0.9;

export type StorageTone = "ok" | "warn" | "full";

export interface SmsStorageLevel {
  used: number;
  max: number;
  free: number;
  tone: StorageTone;
}

/** The MiFi's own store, where this device saves texts (`SaveMode 0`). */
export function smsStorageLevel(
  storage: SmsCount | null | undefined,
  deviceSaysFull: boolean,
): SmsStorageLevel | null {
  if (!storage || storage.LocalMax <= 0) {
    return deviceSaysFull ? { used: 0, max: 0, free: 0, tone: "full" } : null;
  }
  const max = storage.LocalMax;
  const used = Math.min(
    max,
    storage.LocalInbox + storage.LocalOutbox + storage.LocalDraft,
  );
  const tone: StorageTone =
    deviceSaysFull || used >= max
      ? "full"
      : used / max >= WARN_RATIO
        ? "warn"
        : "ok";
  return { used, max, free: max - used, tone };
}

function useToneColor(tone: StorageTone): string | undefined {
  const colors = useAppColors();
  return tone === "full"
    ? colors.ringDanger
    : tone === "warn"
      ? colors.ringWarning
      : undefined;
}

export function SmsSettingsButton({
  tone,
  onPress,
}: {
  tone: StorageTone | undefined;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const dot = useToneColor(tone ?? "ok");

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        tone === "full"
          ? "SMS settings, storage is full"
          : tone === "warn"
            ? "SMS settings, storage almost full"
            : "SMS settings"
      }
      className="h-11 w-11 items-center justify-center rounded-full bg-card data-[active=true]:opacity-70"
    >
      <SlidersHorizontal size={20} color={colors.foreground} />
      {dot && (
        <Box
          className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-card"
          style={{ backgroundColor: dot }}
        />
      )}
    </Pressable>
  );
}

type Part = { label: string; value: number; color: string };

type Colors = ReturnType<typeof useAppColors>;

function simNotListed(storage: SmsCount): number {
  const listed = storage.SimInbox + storage.SimOutbox + storage.SimDraft;
  return Math.max(0, storage.SimUsed - listed);
}

function mifiParts(storage: SmsCount, colors: Colors): Part[] {
  return [
    { label: "Received", value: storage.LocalInbox, color: colors.primary },
    { label: "Sent", value: storage.LocalOutbox, color: colors.dataRingUpload },
    {
      label: "Drafts",
      value: storage.LocalDraft,
      color: colors.mutedForeground,
    },
  ];
}

function simParts(storage: SmsCount, colors: Colors): Part[] {
  return [
    { label: "Received", value: storage.SimInbox, color: colors.primary },
    { label: "Sent", value: storage.SimOutbox, color: colors.dataRingUpload },
    { label: "Drafts", value: storage.SimDraft, color: colors.mutedForeground },
    {
      label: "Not listed",
      value: simNotListed(storage),
      color: colors.mutedForeground,
    },
  ];
}

function UsageBar({ parts, max }: { parts: Part[]; max: number }) {
  const colors = useAppColors();
  const used = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <HStack
      className="h-2 gap-0.5 overflow-hidden rounded-full"
      style={{ backgroundColor: colors.ringTrack }}
    >
      {parts.map((p) =>
        p.value > 0 ? (
          <Box
            key={p.label}
            style={{ flexGrow: p.value / max, backgroundColor: p.color }}
          />
        ) : null,
      )}
      <Box style={{ flexGrow: Math.max(0, 1 - used / max) }} />
    </HStack>
  );
}

function TonePill({ tone }: { tone: StorageTone }) {
  if (tone === "ok") return null;
  const full = tone === "full";
  return (
    <Box
      className={`rounded-full px-2.5 py-0.5 ${full ? "bg-destructive/20" : "bg-primary/15"}`}
    >
      <Text
        className={`text-xs font-semibold ${full ? "text-destructive" : "text-primary"}`}
      >
        {full ? "Full" : "Almost full"}
      </Text>
    </Box>
  );
}

function RingTile({
  icon,
  label,
  parts,
  max,
  free,
  freeColor,
}: {
  icon: ReactNode;
  label: string;
  parts: Part[];
  max: number;
  free: number;
  freeColor?: string;
}) {
  const colors = useAppColors();
  const segments: RingSegment[] = parts
    .filter((p) => p.value > 0)
    .map((p) => ({ value: p.value / max, color: p.color }));

  return (
    <VStack className="flex-1 items-center gap-2.5 rounded-3xl bg-background/60 px-2 py-4">
      <CircularProgress
        size={104}
        strokeWidth={10}
        lineCap="butt"
        trackColor={colors.ringTrack}
        segments={segments}
      >
        <Text
          className="text-2xl leading-none font-extrabold text-foreground"
          style={[TABULAR, freeColor ? { color: freeColor } : null]}
        >
          {free}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground" style={TABULAR}>
          left of {max}
        </Text>
      </CircularProgress>
      <HStack className="items-center gap-1.5">
        {icon}
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </HStack>
    </VStack>
  );
}

function Breakdown({ title, parts }: { title: string; parts: Part[] }) {
  const shown = parts.filter((p) => p.value > 0);
  if (shown.length === 0) return null;
  return (
    <VStack className="gap-1.5">
      <Text className="text-xs text-muted-foreground">{title}</Text>
      {shown.map((p) => (
        <HStack key={p.label} className="items-center gap-2.5">
          <Box
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <Text className="flex-1 text-sm text-foreground">{p.label}</Text>
          <Text className="text-sm font-medium text-foreground" style={TABULAR}>
            {p.value}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

function StorageDetail({
  storage,
  level,
}: {
  storage: SmsCount;
  level: SmsStorageLevel;
}) {
  const colors = useAppColors();
  const toneColor = useToneColor(level.tone);
  const mifi = mifiParts(storage, colors);
  const sim = simParts(storage, colors);
  const notListed = simNotListed(storage);
  const icon = { size: 14, color: colors.mutedForeground };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(120)}
    >
      <VStack className="gap-5 pt-1">
        <HStack className="gap-3">
          <RingTile
            icon={<Router {...icon} />}
            label="On the MiFi"
            parts={mifi}
            max={level.max}
            free={level.free}
            freeColor={toneColor}
          />
          {storage.SimMax > 0 && (
            <RingTile
              icon={<CardSim {...icon} />}
              label="On the SIM"
              parts={sim}
              max={storage.SimMax}
              free={Math.max(0, storage.SimMax - storage.SimUsed)}
            />
          )}
        </HStack>
        <Breakdown title="On the MiFi" parts={mifi} />
        <Breakdown title="On the SIM" parts={sim} />
        {notListed > 0 && (
          <Text className="text-xs leading-relaxed text-muted-foreground">
            {notListed === 1 ? "One message" : `${notListed} messages`} on the
            SIM can&apos;t be shown: the MiFi counts them but doesn&apos;t list
            them.
          </Text>
        )}
      </VStack>
    </Animated.View>
  );
}

export function SmsStorageCard({
  storage,
  level,
}: {
  storage: SmsCount | null;
  level: SmsStorageLevel;
}) {
  const colors = useAppColors();
  const toneColor = useToneColor(level.tone);
  const [open, setOpen] = useState(false);
  const known = storage !== null && level.max > 0;
  const headline = !known
    ? "Message storage is full"
    : level.tone === "full"
      ? "slots free"
      : level.free === 1
        ? "text can still arrive"
        : "texts can still arrive";

  return (
    <Animated.View layout={LinearTransition.duration(220)}>
      <Pressable
        onPress={() => known && setOpen((v) => !v)}
        disabled={!known}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={
          known
            ? `Message storage: ${level.free} of ${level.max} slots free on the MiFi`
            : "Message storage is full"
        }
        accessibilityHint={open ? "Hides the details" : "Shows the details"}
        className="gap-4 rounded-3xl bg-card px-5 py-4"
      >
        <HStack className="items-center gap-2">
          <Router size={16} color={colors.mutedForeground} />
          <Text className="flex-1 text-sm text-muted-foreground">
            Message storage
          </Text>
          <TonePill tone={level.tone} />
          {known && (
            <Box style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </Box>
          )}
        </HStack>

        {known ? (
          <HStack className="items-baseline gap-2">
            <Text
              className="text-5xl leading-none font-extrabold text-foreground"
              style={[TABULAR, toneColor ? { color: toneColor } : null]}
            >
              {level.free}
            </Text>
            <Text className="flex-1 text-base text-muted-foreground">
              {headline}
            </Text>
          </HStack>
        ) : (
          <Text className="text-base font-semibold text-destructive">
            {headline}
          </Text>
        )}

        {known && (
          <VStack className="gap-2">
            <UsageBar parts={mifiParts(storage, colors)} max={level.max} />
            <HStack className="justify-between">
              <Text className="text-xs text-muted-foreground" style={TABULAR}>
                {level.used} of {level.max} used on the MiFi
              </Text>
              {storage.SimMax > 0 && (
                <Text className="text-xs text-muted-foreground" style={TABULAR}>
                  SIM {storage.SimUsed} of {storage.SimMax}
                </Text>
              )}
            </HStack>
          </VStack>
        )}

        {level.tone !== "ok" && !open && (
          <Text className="text-xs leading-relaxed text-muted-foreground">
            {level.tone === "full"
              ? "The MiFi turns new texts away while it's full."
              : "New texts stop arriving when it's full. Delete old conversations to make room."}
          </Text>
        )}

        {open && known && <StorageDetail storage={storage} level={level} />}
      </Pressable>
    </Animated.View>
  );
}
