import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import PulsingDot from "./PulsingDot";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useQuery } from "@tanstack/react-query";
import { formatNetRate, isOnline, networkLabel } from "@/src/api/utils";
import { Divider } from "../ui/divider";
import useSignalConfig from "./SignalConfig";
import SignalPattern from "./SignalPattern";
import { LinearGradient } from "expo-linear-gradient";
import { useAppColors } from "@/src/hooks/useAppColors";
import GradientText from "./GradientText";

/**
 * The "carrier name" field is a TODO — the MiFi API doesn't expose it.
 * The signal-quality text is derived from `signalIcon` (0-5) untiled text.
 */

export default function HeroCard() {
  const client = useHiLinkClient();

  const { data: device } = useQuery({
    queryKey: ["device"],
    queryFn: () => client.getDeviceInfo(),
    refetchInterval: 60000,
  });

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getStatus(),
    refetchInterval: 8000,
  });

  const { data: traffic } = useQuery({
    queryKey: ["traffic"],
    queryFn: () => client.getTraffic(),
    refetchInterval: 2000,
  });

  const colors = useAppColors();

  // The MiFi API doesn't expose carrier name. TODO: when we find a
  // /api/device/information-equivalent endpoint that returns operator
  // name, wire it here.
  const carrier: string | null = "MTN GH";

  // const signalConfig = useSignalConfig(status?.SignalIcon);
  const signalConfig = useSignalConfig(5);

  return (
    <Box className="bg-primary dark:bg-primary/90 mx-4 rounded-2xl p-5  relative overflow-hidden">
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
            colors={[
              colors.primaryBlue,
              colors.secondary,
              colors.dataRingTrack,
              colors.chart4,
              colors.ringDanger,
            ]}
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
