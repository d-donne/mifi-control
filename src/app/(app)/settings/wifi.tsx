import { Section, SettingsSheet } from "@/components/settings/SettingsParts";
import {
  AutoOffRows,
  GuestWifiRows,
  MainNetworkInfo,
  useWifiSummary,
} from "@/components/settings/WifiRows";
import { Text } from "@/components/ui/text";

export default function WifiSheet() {
  const { data, main, guest } = useWifiSummary();

  return (
    <SettingsSheet title="Wi-Fi">
      {!data ? (
        <Text className="px-1 text-sm text-muted-foreground">Loading…</Text>
      ) : (
        <>
          {main && (
            <Section>
              <MainNetworkInfo network={main} />
            </Section>
          )}
          {guest && (
            <Section>
              <GuestWifiRows guest={guest} />
            </Section>
          )}
          <Section>
            <AutoOffRows seconds={data.autoOffSeconds} />
          </Section>
        </>
      )}
    </SettingsSheet>
  );
}
