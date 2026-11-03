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
import Settings from "../app/(tabs)/settings";
import {
  useStoredCredentials,
  type StoredCredentials,
} from "./useStoredCredentials";

const ClientContext = createContext<HiLinkClient | null>(null);

interface HiLinkProviderProps {
  children: ReactNode;
}

interface Connection {
  credentials: StoredCredentials;
  client?: HiLinkClient;
  error?: string;
}

export function HiLinkProvider({ children }: HiLinkProviderProps) {
  const {
    credentials,
    isLoading: credsLoading,
    clear,
  } = useStoredCredentials();
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (credentials) {
      HiLinkClient.connect(
        credentials.baseUrl,
        credentials.username,
        credentials.password,
      )
        .then((client) => {
          if (!cancelled) setConnection({ credentials, client });
        })
        .catch((e) => {
          if (cancelled) return;
          setConnection({
            credentials,
            error:
              e instanceof HiLinkError
                ? `${e.message} (${e.code ?? "unknown code"})`
                : String(e),
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [credentials]);

  const current = connection?.credentials === credentials ? connection : null;
  const client = current?.client ?? null;
  const error = current?.error ?? null;

  if (credsLoading) {
    return (
      <Box className="flex-1 bg-background">
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
      <Box className="flex-1 bg-background">
        <Center className="flex-1 px-6">
          <VStack space="md" className="w-full">
            <Text>Connecting to HiLink failed: {error}</Text>
            {isNetworkError && (
              <Button onPress={() => Linking.openSettings()}>
                <ButtonText>Open Wi-Fi settings</ButtonText>
              </Button>
            )}
            <Button variant="outline" onPress={() => clear()}>
              <ButtonText>Edit credentials</ButtonText>
            </Button>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box className="flex-1 bg-background">
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
