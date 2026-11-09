import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import { SplashScreenController } from "@/components/auth/SplashScreenController";
import { useSession } from "@/src/hooks/useSession";
import {
  focusManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useAppColors } from "@/src/hooks/useAppColors";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useUniwind } from "uniwind";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { HiLinkError, SESSION_CLOSED_CODE } from "../api/errors";

export { default as ErrorBoundary } from "@/components/common/AppErrorBoundary";

// React Native has no window focus: AppState drives refetch-on-return and pauses background polls.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) =>
    setFocused(state === "active"),
  );
  return () => subscription.remove();
});

const TOAST_REPEAT_MS = 30_000;
let lastToast = { message: "", at: 0 };

const queryClient = new QueryClient({
  defaultOptions: {
    // Polls retry on their own; more retries only queue up on the MiFi's one session.
    queries: { retry: 1 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof HiLinkError && error.code === SESSION_CLOSED_CODE) {
        return;
      }
      // A failed poll keeps the last data on screen; the offline banner flags the outage.
      if (query.state.data !== undefined) return;
      const message = error.message;
      const now = Date.now();
      if (message === lastToast.message && now - lastToast.at < TOAST_REPEAT_MS)
        return;
      lastToast = { message, at: now };
      Toast.show({ type: "error", text1: "Error", text2: message });
    },
  }),
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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

// Without this, navigators paint React Navigation's light default behind
// screens that haven't rendered yet (visible as a flash on lazy tabs).
function useNavigationTheme(): typeof DefaultTheme {
  const colors = useAppColors();
  const { theme } = useUniwind();
  const base = theme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.destructive,
    },
  };
}

function RootNavigator() {
  const connected = useSession((s) => s.status === "connected");
  const theme = useNavigationTheme();
  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={connected}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!connected}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
