import { usePalette } from "@/src/hooks/usePalette";
import { useSession } from "@/src/hooks/useSession";
import { SplashScreen } from "expo-router";
import { useEffect } from "react";

void SplashScreen.preventAutoHideAsync();

/**
 * Keeps the native splash up while saved credentials load and the startup
 * reconnect runs, so a normal launch goes splash → Home with no sign-in
 * screen flash.
 */
export function SplashScreenController() {
  const sessionReady = useSession(
    (s) => s.status !== "hydrating" && !s.restoring,
  );
  const paletteReady = usePalette((s) => s.hydrated);
  const ready = sessionReady && paletteReady;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return null;
}
