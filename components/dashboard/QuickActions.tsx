import ComposeSheet from "@/components/sms/ComposeSheet";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  ChartPie,
  Globe,
  GlobeX,
  MessageSquarePlus,
  type LucideIcon,
} from "@/components/icons";
import { parseDataLimit } from "@/src/api/utils";
import { useAppColors, withAlpha } from "@/src/hooks/useAppColors";
import { useDataPlan } from "@/src/hooks/useDataUsage";
import { useMobileData, useSetMobileData } from "@/src/hooks/useMifiControls";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

function Tile({
  Icon,
  label,
  state,
  active = false,
  busy = false,
  disabled = false,
  onPress,
  role = "button",
}: {
  Icon: LucideIcon;
  label: string;
  state: string;
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  role?: "button" | "switch";
}) {
  const colors = useAppColors();
  const ink = active ? colors.primaryForeground : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={
        role === "switch" ? { checked: active, busy } : { busy }
      }
      className="flex-1 rounded-2xl p-3.5 data-[active=true]:opacity-80"
      style={{ backgroundColor: active ? colors.primary : colors.card }}
    >
      <Box
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{
          backgroundColor: active
            ? withAlpha(colors.primaryForeground, 0.12)
            : colors.muted,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={ink} />
        ) : (
          <Icon size={18} color={ink} />
        )}
      </Box>
      <Text
        className="mt-3 text-sm font-semibold"
        style={{ color: ink }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        className="text-xs"
        style={{
          color: active
            ? withAlpha(colors.primaryForeground, 0.72)
            : colors.mutedForeground,
        }}
        numberOfLines={1}
      >
        {state}
      </Text>
    </Pressable>
  );
}

function MobileDataTile() {
  const { data: enabled } = useMobileData();
  const toggle = useSetMobileData();

  return (
    <Tile
      Icon={enabled === false ? GlobeX : Globe}
      label="Mobile data"
      state={
        toggle.error
          ? "Couldn't switch"
          : enabled === undefined
            ? " "
            : enabled
              ? "On"
              : "Off"
      }
      role="switch"
      active={enabled === true}
      busy={toggle.isPending}
      disabled={enabled === undefined}
      onPress={() => toggle.mutate(!enabled)}
    />
  );
}

function DataPlanTile() {
  const router = useRouter();
  const { data: plan } = useDataPlan();
  const limit =
    plan?.SetMonthData === 1 ? parseDataLimit(plan.DataLimit) : null;

  return (
    <Tile
      Icon={ChartPie}
      label="Data plan"
      state={
        !plan
          ? " "
          : limit && limit.amount > 0
            ? `${limit.amount} ${limit.unit}`
            : "Not set"
      }
      onPress={() => router.push("/data-plan")}
    />
  );
}

export default function QuickActions() {
  const [composing, setComposing] = useState(false);

  return (
    <VStack space="sm">
      <Text className="px-1 text-sm font-semibold text-foreground">
        Quick actions
      </Text>
      <Box className="flex-row gap-3">
        <MobileDataTile />
        <Tile
          Icon={MessageSquarePlus}
          label="New SMS"
          state="Send a text"
          onPress={() => setComposing(true)}
        />
        <DataPlanTile />
      </Box>
      <ComposeSheet visible={composing} onClose={() => setComposing(false)} />
    </VStack>
  );
}
