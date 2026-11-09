import {
  getDataRoaming,
  getMobileData,
  getNetworkMode,
  reboot,
  setDataRoaming,
  setMobileData,
  setNetworkMode,
  type NetworkMode,
} from "@/src/api/routes";
import { HiLinkError } from "@/src/api/errors";
import { HiLinkClient } from "@/src/api/main";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { STATUS_QUERY_KEY } from "@/src/hooks/useDeviceStatus";
import { useHiLinkQuery } from "@/src/hooks/useHiLinkQuery";
import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

export const MOBILE_DATA_QUERY_KEY = ["mobile-data"] as const;
export const ROAMING_QUERY_KEY = ["roaming"] as const;
export const NETWORK_MODE_QUERY_KEY = ["net-mode"] as const;

export function useMobileData() {
  return useHiLinkQuery({
    queryKey: MOBILE_DATA_QUERY_KEY,
    queryFn: getMobileData,
    refetchInterval: 30_000,
  });
}

export function useSetMobileData() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setMobileData(client, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: MOBILE_DATA_QUERY_KEY });
      const previous = queryClient.getQueryData<boolean>(MOBILE_DATA_QUERY_KEY);
      queryClient.setQueryData(MOBILE_DATA_QUERY_KEY, enabled);
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(MOBILE_DATA_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MOBILE_DATA_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
      ]),
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The MiFi drops off for 40–60 s while it restarts.
const RESTART_POLL_MS = 3_000;
const RESTART_MIN_WAIT_MS = 20_000;
const RESTART_GIVE_UP_MS = 180_000;

async function waitForRestart(baseUrl: string): Promise<void> {
  const started = Date.now();
  let wentDown = false;
  while (Date.now() - started < RESTART_GIVE_UP_MS) {
    await sleep(RESTART_POLL_MS);
    const up = await HiLinkClient.isReachable(baseUrl);
    if (!up) wentDown = true;
    else if (wentDown || Date.now() - started > RESTART_MIN_WAIT_MS) return;
  }
  throw new Error("The MiFi hasn't come back after 3 minutes");
}

export type RestartStage = "sending" | "waiting" | "done" | "failed";

const useRestartState = create<{
  stage: RestartStage | null;
  error: string | null;
}>(() => ({ stage: null, error: null }));

const isRestarting = (stage: RestartStage | null) =>
  stage === "sending" || stage === "waiting";

export function restartStatus(
  stage: RestartStage | null,
  error: string | null,
): string {
  switch (stage) {
    case "sending":
      return "Restarting…";
    case "waiting":
      return "Waiting for the MiFi to come back (about a minute)";
    case "done":
      return "Restarted and back online";
    case "failed":
      return `Couldn't restart: ${error}`;
    default:
      return "Takes about a minute";
  }
}

/** Shared across screens, so a restart started anywhere shows its progress everywhere. */
export function useRestart() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  const baseUrl = useSession((s) => s.credentials?.baseUrl);
  const { stage, error } = useRestartState();

  async function start() {
    if (isRestarting(useRestartState.getState().stage)) return;
    useRestartState.setState({ stage: "sending", error: null });
    try {
      try {
        await reboot(client);
      } catch (cause) {
        // The MiFi often restarts before it answers; only its own refusal is a failure.
        if (cause instanceof HiLinkError) throw cause;
      }
      useRestartState.setState({ stage: "waiting" });
      if (baseUrl) await waitForRestart(baseUrl);
      useRestartState.setState({ stage: "done" });
    } catch (cause) {
      useRestartState.setState({
        stage: "failed",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      void queryClient.invalidateQueries();
    }
  }

  return {
    stage,
    busy: isRestarting(stage),
    status: restartStatus(stage, error),
    failed: stage === "failed",
    start,
  };
}

export function useDataRoaming() {
  return useHiLinkQuery({
    queryKey: ROAMING_QUERY_KEY,
    queryFn: getDataRoaming,
    staleTime: 60_000,
  });
}

export function useSetDataRoaming() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setDataRoaming(client, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ROAMING_QUERY_KEY });
      const previous = queryClient.getQueryData<boolean>(ROAMING_QUERY_KEY);
      queryClient.setQueryData(ROAMING_QUERY_KEY, enabled);
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(ROAMING_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ROAMING_QUERY_KEY }),
  });
}

export function useNetworkMode() {
  return useHiLinkQuery({
    queryKey: NETWORK_MODE_QUERY_KEY,
    queryFn: getNetworkMode,
    staleTime: 60_000,
  });
}

export function useSetNetworkMode() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mode: string) => {
      try {
        await setNetworkMode(client, mode);
      } catch (error) {
        // The answer can be lost while the MiFi reconnects; check what it applied.
        if (error instanceof HiLinkError) throw error;
        await sleep(3_000);
        const applied = await getNetworkMode(client);
        if (applied.mode !== mode) throw error;
      }
    },
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: NETWORK_MODE_QUERY_KEY });
      const previous = queryClient.getQueryData<NetworkMode>(
        NETWORK_MODE_QUERY_KEY,
      );
      queryClient.setQueryData<NetworkMode>(NETWORK_MODE_QUERY_KEY, (old) =>
        old ? { ...old, mode } : old,
      );
      return { previous };
    },
    onError: (_error, _mode, context) => {
      queryClient.setQueryData(NETWORK_MODE_QUERY_KEY, context?.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: NETWORK_MODE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
      ]),
  });
}
