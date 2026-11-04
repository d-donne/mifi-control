import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ArrowDown, ArrowUp, Power } from "@/components/icons";
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
import { Divider } from "../ui/divider";
import useSignalConfig from "./SignalConfig";
import SignalPattern from "./SignalPattern";
import { useAppColors } from "@/src/hooks/useAppColors";
import GradientText from "../common/GradientText";

export default function HeroCard() {
  const { data: device } = useDeviceInfo();
  const { data: status } = useStatus();
  const { data: traffic } = useTraffic();
  const { data: plmn } = usePlmn();

  const colors = useAppColors();

  const name = plmn?.FullName || plmn?.ShortName;
  const country = countryFromPlmn(plmn?.Numeric);
  const carrier = name ? (country ? `${name} · ${country}` : name) : null;

  const signalConfig = useSignalConfig(status?.SignalIcon);

  return (
    <Box className="relative overflow-hidden rounded-2xl bg-primary p-5 dark:bg-primary/90">
      {/* Top row: eyebrow + status pill */}
      <HStack className="items-center justify-between">
        <Text className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase">
          {device?.DeviceName ?? "MiFi"}
        </Text>
        <HStack space="sm" className="items-center">
          <PulsingDot
            isOnline={isOnline(status?.ConnectionStatus)}
            colorClass="bg-online-dot"
          />
          <Text className="text-sm font-medium">
            {isOnline(status?.ConnectionStatus) ? "Online" : "Offline"}
          </Text>
        </HStack>
        <SignalPattern />
      </HStack>

      {/* Middle: network type + carrier + signal bars */}
      <HStack className="mt-4 items-end justify-between">
        <VStack>
          <GradientText
            text={networkLabel(status?.CurrentNetworkTypeEx)}
            colors={[colors.primaryForeground, colors.secondary]}
            fontSize={36}
            fontWeight="700"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <HStack className="mt-2 items-center-safe" space="md">
            <Text className="text-sm font-bold text-primary-foreground/80">
              {carrier ?? signalConfig.text}
            </Text>
            {carrier && (
              <Text className="text-xs text-primary-foreground/70">
                {signalConfig.text.toUpperCase()}
              </Text>
            )}
          </HStack>
        </VStack>
        <signalConfig.Icon
          strokeWidth={2.5}
          color={signalConfig.color}
          size={status?.SignalIcon === 0 ? 23 : 38}
        />
      </HStack>

      <Divider className="mt-0.5 h-0.5 bg-linear-180 from-primary to-secondary/70 mask-linear-from-48" />

      <HStack className="items-center justify-between pt-2">
        <HStack space="lg">
          <HStack space="xs" className="items-center">
            <ArrowDown size={14} color={colors.primaryForeground} />
            <Text className="font-bold text-primary-foreground">
              {formatNetRate(traffic?.CurrentDownloadRate)}
            </Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <ArrowUp size={14} color={colors.primaryForeground} />
            <Text className="font-bold text-primary-foreground">
              {formatNetRate(traffic?.CurrentUploadRate)}
            </Text>
          </HStack>
        </HStack>
        <HStack space="xs" className="items-center">
          <Power size={12} color={colors.primaryForeground} />
          <Text className="text-xs font-semibold text-primary-foreground/80">
            {device ? `Up ${formatDuration(num(device.uptime))}` : "—"}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}
