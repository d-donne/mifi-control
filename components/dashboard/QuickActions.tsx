import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useMobileData, useSetMobileData } from "@/src/hooks/useMifiControls";
import { Globe } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";

const COLUMNS = 4;

function ToggleAction({
  label,
  on,
  busy,
  onPress,
  renderIcon,
}: {
  label: string;
  on: boolean | undefined;
  busy: boolean;
  onPress: () => void;
  renderIcon: (color: string) => React.ReactNode;
}) {
  const colors = useAppColors();
  const active = on === true;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy || on === undefined}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: active, busy }}
      className="items-center active:opacity-70"
      style={{ width: `${100 / COLUMNS}%` }}
    >
      <View
        className={
          active
            ? "h-16 w-16 items-center justify-center rounded-3xl bg-primary"
            : "h-16 w-16 items-center justify-center rounded-3xl bg-card"
        }
      >
        {busy || on === undefined ? (
          <ActivityIndicator
            color={active ? colors.primaryForeground : colors.mutedForeground}
          />
        ) : (
          renderIcon(active ? colors.primaryForeground : colors.foreground)
        )}
      </View>
      <Text className="pt-2 text-xs font-medium text-foreground">{label}</Text>
      <Text className="text-[10px] text-muted-foreground">
        {on === undefined ? " " : active ? "On" : "Off"}
      </Text>
    </Pressable>
  );
}

function MobileDataAction() {
  const { data: enabled } = useMobileData();
  const toggle = useSetMobileData();

  return (
    <ToggleAction
      label="Mobile data"
      on={enabled}
      busy={toggle.isPending}
      onPress={() => toggle.mutate(!enabled)}
      renderIcon={(color) => <Globe size={22} color={color} />}
    />
  );
}

export default function QuickActions() {
  return (
    <VStack space="md">
      <Text className="px-1 text-sm font-semibold text-foreground">
        Quick actions
      </Text>
      <View className="flex-row flex-wrap">
        <MobileDataAction />
      </View>
    </VStack>
  );
}
