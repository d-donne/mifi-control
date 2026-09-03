import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HiLinkError } from "@/src/api/errors";
import { HiLinkClient } from "@/src/api/main";
import * as Linking from "expo-linking";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Settings from "../app/settings";
import { useStoredCredentials } from "./useStoredCredentials";

const ClientContext = createContext<HiLinkClient | null>(null);

interface HiLinkProviderProps {
  children: ReactNode;
}

export function HiLinkProvider({ children }: HiLinkProviderProps) {
  const { credentials, isLoading: credsLoading, clear } = useStoredCredentials();
  const [client, setClient] = useState<HiLinkClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!credentials) return;
    let cancelled = false;
    setError(null);
    setClient(null);
    HiLinkClient.connect(
      credentials.baseUrl,
      credentials.username,
      credentials.password,
    )
      .then((c) => {
        if (!cancelled) setClient(c);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof HiLinkError
            ? `${e.message} (${e.code ?? "unknown code"})`
            : String(e),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [credentials]);

  if (credsLoading) {
    return (
      <Box className="bg-background flex-1">
        <Center className="flex-1">
          <Text>Loading…</Text>
        </Center>
      </Box>
    );
  }

  if (!credentials) {
    return <Settings />;
  }

  if (error) {
    const isNetworkError = error.startsWith("Couldn't reach MiFi");
    return (
      <Box className="bg-background flex-1">
        <Center className="flex-1 px-6">
          <VStack space="md" className="w-full">
            <Text>Connecting to HiLink failed: {error}</Text>
            {isNetworkError && (
              <Button onPress={() => Linking.openSettings()}>
                <ButtonText>Open Wi-Fi settings</ButtonText>
              </Button>
            )}
            <Button
              variant="outline"
              onPress={() => clear()}
            >
              <ButtonText>Edit credentials</ButtonText>
            </Button>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box className="bg-background flex-1">
        <Center className="flex-1">
          <Text>Connecting to HiLink…</Text>
        </Center>
      </Box>
    );
  }

  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}

export function useHiLinkClient(): HiLinkClient {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error("useHiLinkClient must be used within a HiLinkProvider");
  }
  return client;
}
