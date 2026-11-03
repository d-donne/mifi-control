import {
  blockDevice,
  forgetDevice,
  getMacFilter,
  renameDevice,
  unblockDevice,
} from "@/src/api/routes";
import type { LanHost } from "@/src/api/types";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import {
  HOSTS_QUERY_KEY,
  hideForgottenHost,
  showForgottenHost,
  withoutForgotten,
} from "@/src/hooks/useLanHosts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const MAC_FILTER_QUERY_KEY = ["macfilter"] as const;

// Block and unblock each read then rewrite the whole list, so they must not
// interleave; mutations sharing a scope run one at a time.
const LAN_WRITE_SCOPE = { id: "lan-write" };

export function useMacFilter() {
  return useHiLinkQuery({
    queryKey: MAC_FILTER_QUERY_KEY,
    queryFn: getMacFilter,
    refetchInterval: 30_000,
  });
}

function useInvalidateDevices() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: HOSTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MAC_FILTER_QUERY_KEY }),
    ]);
}

export function useRenameDevice() {
  const client = useHiLinkClient();
  const invalidate = useInvalidateDevices();
  return useMutation({
    scope: LAN_WRITE_SCOPE,
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameDevice(client, id, name),
    onSuccess: invalidate,
  });
}

export function useBlockDevice() {
  const client = useHiLinkClient();
  const invalidate = useInvalidateDevices();
  return useMutation({
    scope: LAN_WRITE_SCOPE,
    mutationFn: (host: LanHost) => blockDevice(client, host),
    onSuccess: invalidate,
  });
}

export function useUnblockDevice() {
  const client = useHiLinkClient();
  const invalidate = useInvalidateDevices();
  return useMutation({
    scope: LAN_WRITE_SCOPE,
    mutationFn: (mac: string) => unblockDevice(client, mac),
    onSuccess: invalidate,
  });
}

export function useForgetDevice() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    scope: LAN_WRITE_SCOPE,
    mutationFn: (host: LanHost) => forgetDevice(client, host),
    onMutate: async (host) => {
      hideForgottenHost(host.MacAddress);
      await queryClient.cancelQueries({ queryKey: HOSTS_QUERY_KEY });
      queryClient.setQueryData<LanHost[]>(HOSTS_QUERY_KEY, (hosts) =>
        hosts ? withoutForgotten(hosts) : hosts,
      );
    },
    onError: (_error, host) => {
      showForgottenHost(host.MacAddress);
      void queryClient.invalidateQueries({ queryKey: HOSTS_QUERY_KEY });
    },
  });
}
