import SmsList from "@/components/sms/SmsList";
import { useAppColors } from "@/src/hooks/useAppColors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Sms() {
  const colors = useAppColors();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SmsList />
    </SafeAreaView>
  );
}
