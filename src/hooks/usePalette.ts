import {
  cssVariables,
  DEFAULT_PALETTE,
  PALETTE_IDS,
  PALETTES,
  type PaletteId,
} from "@/src/theme/palettes";
import * as SecureStore from "expo-secure-store";
import { Uniwind } from "uniwind";
import { create } from "zustand";

const STORAGE_KEY = "mifi.palette";

type PaletteState = {
  palette: PaletteId;
  hydrated: boolean;
  setPalette: (id: PaletteId) => void;
};

function apply(id: PaletteId) {
  const { light, dark } = PALETTES[id];
  Uniwind.updateCSSVariables("light", cssVariables(light));
  Uniwind.updateCSSVariables("dark", cssVariables(dark));
}

export const usePalette = create<PaletteState>()((set) => ({
  palette: DEFAULT_PALETTE,
  hydrated: false,
  setPalette: (id) => {
    apply(id);
    set({ palette: id });
    void SecureStore.setItemAsync(STORAGE_KEY, id).catch(() => {});
  },
}));

function isPaletteId(value: string | null): value is PaletteId {
  return PALETTE_IDS.some((id) => id === value);
}

async function hydrate(): Promise<void> {
  const saved = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  if (isPaletteId(saved)) {
    apply(saved);
    usePalette.setState({ palette: saved });
  }
  usePalette.setState({ hydrated: true });
}

apply(DEFAULT_PALETTE);
void hydrate();
