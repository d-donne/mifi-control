import PalettePicker from "@/components/settings/PalettePicker";
import { SettingsSheet } from "@/components/settings/SettingsParts";

export default function AppearanceSheet() {
  return (
    <SettingsSheet title="Appearance">
      <PalettePicker />
    </SettingsSheet>
  );
}
