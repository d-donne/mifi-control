import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import PulsingDot from "../common/PulsingDot";
import { getDevice, getMonitoring } from "@/src/api/routes";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { formatNetRate, isOnline, networkLabel } from "@/src/api/utils";
import { Divider } from "../ui/divider";
import useSignalConfig from "./SignalConfig";
import SignalPattern from "./SignalPattern";
import { useAppColors } from "@/src/hooks/useAppColors";
import GradientText from "../common/GradientText";

/**
 * The "carrier name" field is a TODO — the MiFi API doesn't expose it.
 * The signal-quality text is derived from `signalIcon` (0-5) untiled text.
 * v2: name can be got from /net/current-plmn
 */

export default function HeroCard() {
  const { data: device } = useHiLinkQuery({
    queryKey: ["device"],
    queryFn: (client) => getDevice(client, "information"),
    refetchInterval: 60000,
  });

  const { data: status } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8000,
  });

  const { data: traffic } = useHiLinkQuery({
    queryKey: ["traffic"],
    queryFn: (client) => getMonitoring(client, "traffic-statistics"),
    refetchInterval: 2000,
  });

  const colors = useAppColors();

  const carrier: string | null = "MTN GH";

  const signalConfig = useSignalConfig(status?.SignalIcon);

  return (
    <Box className="bg-primary dark:bg-primary/90 rounded-2xl p-5  relative overflow-hidden">
      {/* Top row: eyebrow + status pill */}
      <HStack className="items-center justify-between">
        <Text className="text-xs uppercase tracking-wider text-primary-foreground/80 font-semibold">
          {device?.DeviceName ?? "MiFi"}
        </Text>
        <HStack space="sm" className="items-center">
          <PulsingDot
            isOnline={isOnline(status?.ConnectionStatus)}
            colorClass="bg-online-dot"
          />
          <Text className="text-sm font-medium ">
            {isOnline(status?.ConnectionStatus) ? "Online" : "Offline"}
          </Text>
        </HStack>
        <SignalPattern />
      </HStack>

      {/* Middle: network type + carrier + signal bars */}
      <HStack className="items-end justify-between mt-4">
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

      <Divider className="h-0.5 mt-0.5 bg-linear-180 mask-linear-from-48 from-primary to-secondary/70" />

      {/* Bottom: DL/UL rates */}
      <HStack space="lg">
        <HStack space="xs" className="items-center">
          <ArrowUp size={14} color="indigo" />
          <Text className="font-semibold text-secondary">
            {formatNetRate(traffic?.CurrentUploadRate ?? 0)}
          </Text>
        </HStack>
        <HStack space="xs" className="items-center">
          <ArrowDown size={14} color="green" />
          <Text className=" font-bold text-green-800">
            {formatNetRate(traffic?.CurrentDownloadRate ?? 0)}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}
