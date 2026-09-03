import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Slot } from "expo-router";
import { HiLinkProvider } from "../hooks/HiLinkProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { HiLinkError } from "../api/errors";

const queryClinet = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: HiLinkError) => {
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
      <SafeAreaProvider>
        <StatusBar animated style="light" />
        <GluestackUIProvider mode="system">
          <HiLinkProvider>
            <Slot />
          </HiLinkProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
      <Toast />
    </QueryClientProvider>
  );
}
