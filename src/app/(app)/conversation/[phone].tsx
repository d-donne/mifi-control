import ThreadView from "@/components/sms/ThreadView";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConversationScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const colors = useAppColors();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ThreadView phone={phone ?? ""} />
    </SafeAreaView>
  );
}
