import { HiLinkClient } from "@/src/api/main";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useSession } from "./useSession";

const ClientContext = createContext<HiLinkClient | null>(null);

/**
 * Provides the connected client to the signed-in screens. Renders nothing
 * without one, so screens never see a null client while the auth guard is
 * redirecting them away. Device data (SMS etc.) is dropped from the cache
 * when the signed-in area unmounts; the sign-in screen's probe is kept.
 */
export function HiLinkProvider({ children }: { children: ReactNode }) {
  const client = useSession((s) => s.client);
  const queryClient = useQueryClient();

  useEffect(
    () => () =>
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "probe",
      }),
    [queryClient],
  );

  if (!client) return null;
  return <ClientContext value={client}>{children}</ClientContext>;
}

export function useHiLinkClient(): HiLinkClient {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error("useHiLinkClient must be used within a HiLinkProvider");
  }
  return client;
}
