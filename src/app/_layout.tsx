import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import { SplashScreenController } from "@/components/auth/SplashScreenController";
import { useSession } from "@/src/hooks/useSession";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { HiLinkError, SESSION_CLOSED_CODE } from "../api/errors";

const queryClinet = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: HiLinkError) => {
      if (error instanceof HiLinkError && error.code === SESSION_CLOSED_CODE) {
        return;
      }
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error instanceof HiLinkError ? error.message : String(error),
      });
    },
  }),
});

export default function App() {
  return (
    <QueryClientProvider client={queryClinet}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar animated style="auto" />
          <GluestackUIProvider mode="system">
            <SplashScreenController />
            <RootNavigator />
          </GluestackUIProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      <Toast />
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const connected = useSession((s) => s.status === "connected");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={connected}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!connected}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
