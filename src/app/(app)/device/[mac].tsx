import DeviceDetail from "@/components/devices/DeviceDetail";
import { useLocalSearchParams } from "expo-router";

export default function DeviceScreen() {
  const { mac } = useLocalSearchParams<{ mac: string }>();
  return <DeviceDetail mac={mac ?? ""} />;
}
