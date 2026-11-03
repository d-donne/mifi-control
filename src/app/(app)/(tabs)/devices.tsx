import DeviceList from "@/components/devices/DeviceList";
import { useAppColors } from "@/src/hooks/useAppColors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Devices() {
  const colors = useAppColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DeviceList />
    </SafeAreaView>
  );
}
