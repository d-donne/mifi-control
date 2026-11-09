import { formatClockTime } from "@/src/api/utils/date";
import * as Updates from "expo-updates";
import { create } from "zustand";

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "downloading" }
  | { kind: "restarting" }
  | { kind: "upToDate"; at: number }
  | { kind: "failed"; message: string };

const useUpdateState = create<{ phase: Phase; downloaded: boolean }>(() => ({
  phase: { kind: "idle" },
  downloaded: false,
}));

const set = (phase: Phase) => useUpdateState.setState({ phase });

/** Shared so the Settings card and the App sheet show the same check. */
export function useAppUpdate() {
  // Also true when the startup check already downloaded an update.
  const { isUpdatePending, currentlyRunning } = Updates.useUpdates();
  const { phase, downloaded } = useUpdateState();
  const ready = isUpdatePending || downloaded;
  const available = __DEV__ ? false : Updates.isEnabled;
  const busy =
    phase.kind === "checking" ||
    phase.kind === "downloading" ||
    phase.kind === "restarting";

  async function run() {
    try {
      if (ready) {
        set({ kind: "restarting" });
        await Updates.reloadAsync();
        return;
      }
      set({ kind: "checking" });
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        set({ kind: "upToDate", at: Date.now() });
        return;
      }
      set({ kind: "downloading" });
      await Updates.fetchUpdateAsync();
      useUpdateState.setState({ downloaded: true, phase: { kind: "idle" } });
    } catch (error) {
      set({
        kind: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const status = !available
    ? "Off in development builds"
    : phase.kind === "checking"
      ? "Checking…"
      : phase.kind === "downloading"
        ? "Downloading…"
        : phase.kind === "restarting"
          ? "Restarting…"
          : phase.kind === "failed"
            ? `Couldn't update: ${phase.message}`
            : ready
              ? "Update downloaded, restart to use it"
              : phase.kind === "upToDate"
                ? `Up to date · checked ${formatClockTime(phase.at)}`
                : "Checks each time the app starts";

  return {
    available,
    ready,
    busy,
    failed: phase.kind === "failed",
    status,
    action: ready ? "Restart to update" : "Check for updates",
    run,
    currentlyRunning,
  };
}
