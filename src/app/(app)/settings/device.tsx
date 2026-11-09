import {
  InfoRow,
  Section,
  SettingsSheet,
} from "@/components/settings/SettingsParts";
import { formatDuration, num } from "@/src/api/utils";
import { useDeviceInfo } from "@/src/hooks/useDeviceStatus";
import { useSession } from "@/src/hooks/useSession";

export default function DeviceSheet() {
  const { data: device } = useDeviceInfo();
  const credentials = useSession((s) => s.credentials);

  return (
    <SettingsSheet title="This MiFi">
      <Section>
        <InfoRow
          label="Model"
          value={device ? `HUAWEI ${device.DeviceName}` : undefined}
        />
        <InfoRow label="Firmware" value={device?.SoftwareVersion} />
        <InfoRow label="IMEI" value={device?.Imei} />
        <InfoRow
          label="Uptime"
          value={device ? formatDuration(num(device.uptime)) : undefined}
        />
      </Section>
      <Section title="Connection">
        <InfoRow
          label="Address"
          value={credentials?.baseUrl.replace(/^https?:\/\//, "")}
        />
        <InfoRow label="Signed in as" value={credentials?.username} />
      </Section>
    </SettingsSheet>
  );
}
