import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { HiLinkProvider } from "../hooks/HiLinkProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const queryClinet = new QueryClient();

/**
 * Top-level layout. Pure providers — no navigation component here, because
 * the (tabs) route group owns the navigation. The `<HiLinkProvider>` renders
 * `<Settings />` inline when there are no stored credentials (first run),
 * and renders the (tabs) Slot when credentials are present.
 */
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
    </QueryClientProvider>
  );
}
