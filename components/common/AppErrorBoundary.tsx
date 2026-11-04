import { useAppColors } from "@/src/hooks/useAppColors";
import { SplashScreen, type ErrorBoundaryProps } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

// Rendered outside the root layout, so the Gluestack and safe-area
// providers aren't available here.
export default function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useAppColors();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ alignItems: "center", gap: 12 }}>
        <TriangleAlert size={32} color={colors.destructive} />
        <Text
          style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            textAlign: "center",
            fontSize: 14,
            color: colors.mutedForeground,
          }}
        >
          The app hit an unexpected error. Try again, or close and reopen it.
        </Text>
        <ScrollView
          style={{ maxHeight: 120, alignSelf: "stretch" }}
          contentContainerStyle={{ padding: 12 }}
        >
          <Text
            selectable
            style={{ fontSize: 12, color: colors.mutedForeground }}
          >
            {error.message}
          </Text>
        </ScrollView>
        <Pressable
          onPress={() => void retry()}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: 8,
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontWeight: "600", color: colors.primaryForeground }}>
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
