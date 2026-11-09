import MobileDataRow from "@/components/settings/MobileDataRow";
import {
  DataRoamingRow,
  NetworkModeRow,
} from "@/components/settings/MobileNetworkRows";
import {
  NavRow,
  Section,
  SettingsSheet,
} from "@/components/settings/SettingsParts";
import { describePlan } from "@/src/api/utils";
import { useDataPlan } from "@/src/hooks/useDataUsage";
import { useRouter } from "expo-router";

export default function MobileNetworkSheet() {
  const router = useRouter();
  const { data: plan } = useDataPlan();
  return (
    <SettingsSheet title="Mobile network">
      <Section>
        <MobileDataRow />
        <DataRoamingRow />
        <NetworkModeRow />
      </Section>
      <Section>
        <NavRow
          label="Data plan"
          value={describePlan(plan)}
          onPress={() => router.replace("/data-plan")}
        />
      </Section>
    </SettingsSheet>
  );
}
