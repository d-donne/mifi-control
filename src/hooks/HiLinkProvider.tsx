import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { HiLinkError } from "@/src/api/errors";
import { HiLinkClient } from "@/src/api/main";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const ClientContext = createContext<HiLinkClient | null>(null);

interface HiLinkProviderProps {
  baseUrl: string;
  username: string;
  password: string;
  children: ReactNode;
}

export function HiLinkProvider({
  baseUrl,
  username,
  password,
  children,
}: HiLinkProviderProps) {
  const [client, setClient] = useState<HiLinkClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    HiLinkClient.connect(baseUrl, username, password)
      .then(setClient)
      .catch((e) =>
        setError(
          e instanceof HiLinkError
            ? `${e.message} (${e.code ?? "unknown code"})`
            : String(e),
        ),
      );
  }, [baseUrl, username, password]);

  if (error) {
    return (
      <Box className="bg-background flex-1">
        <Center className="flex-1">
          <Text>Connecting to HiLink failed: {error}</Text>
        </Center>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box className="bg-background flex-1">
        <Center>
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
