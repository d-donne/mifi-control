import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { BASEURL, PASS, USERNAME } from "../api/constants";
import { HiLinkProvider } from "../hooks/HiLinkProvider";

const queryClinet = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClinet}>
      <HiLinkProvider baseUrl={BASEURL} username={USERNAME} password={PASS}>
        <GluestackUIProvider mode="system">
          <Stack
            screenOptions={{ headerShown: false, statusBarStyle: "dark" }}
          />
        </GluestackUIProvider>
      </HiLinkProvider>
    </QueryClientProvider>
  );
}
