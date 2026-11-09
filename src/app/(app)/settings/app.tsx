import AppUpdates from "@/components/settings/AppUpdates";
import { Section, SettingsSheet } from "@/components/settings/SettingsParts";

export default function AppSheet() {
  return (
    <SettingsSheet title="App">
      <Section>
        <AppUpdates />
      </Section>
    </SettingsSheet>
  );
}
