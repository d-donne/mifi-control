import "@/global.css";
import React, { useState } from "react";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";

import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Text } from "@/components/ui/text";

export default function App() {
  return (
    <GluestackUIProvider mode="system">
        <Stack screenOptions={{ headerShown: false, statusBarStyle: "dark" }} />
    </GluestackUIProvider>
  );
}
