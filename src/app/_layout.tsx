import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HiLinkProvider } from "../hooks/HiLinkProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const queryClinet = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClinet}>
      <SafeAreaProvider>
        <StatusBar animated style="light" />
        <GluestackUIProvider mode="system">
          <HiLinkProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </HiLinkProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
