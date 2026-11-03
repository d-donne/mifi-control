import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { setDataPlan } from "@/src/api/routes";
import type { DataPlan } from "@/src/api/types";
import { parseDataLimit, type DataUnit } from "@/src/api/utils";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  DATA_PLAN_QUERY_KEY,
  MONTH_STATISTICS_QUERY_KEY,
  useDataPlan,
} from "@/src/hooks/useDataUsage";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

const UNITS: DataUnit[] = ["GB", "MB"];

function DataPlanForm({ plan }: { plan: DataPlan }) {
  const colors = useAppColors();
  const router = useRouter();
  const client = useHiLinkClient();
  const queryClient = useQueryClient();

  const current = parseDataLimit(plan.DataLimit);
  const hasLimit = current !== null && current.amount > 0;
  const [enabled, setEnabled] = useState(plan.SetMonthData === 1);
  const [amount, setAmount] = useState(hasLimit ? String(current.amount) : "");
  const [unit, setUnit] = useState<DataUnit>(hasLimit ? current.unit : "GB");
  const [startDay, setStartDay] = useState(String(plan.StartDay || 1));
  const [threshold, setThreshold] = useState(String(plan.MonthThreshold || 90));
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: Parameters<typeof setDataPlan>[1]) =>
      setDataPlan(client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DATA_PLAN_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MONTH_STATISTICS_QUERY_KEY }),
      ]);
      router.back();
    },
  });

  function submit() {
    const day = Number(startDay);
    const warn = Number(threshold);
    const limit = Number(amount);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setFormError("The cycle start day must be between 1 and 31.");
      return;
    }
    if (!Number.isInteger(warn) || warn < 1 || warn > 100) {
      setFormError("The warning level must be between 1 and 100%.");
      return;
    }
    if (enabled && (!Number.isInteger(limit) || limit <= 0)) {
      setFormError("Enter a data limit as a whole number.");
      return;
    }
    setFormError(null);
    save.mutate({
      startDay: day,
      dataLimit: enabled ? `${limit}${unit}` : plan.DataLimit,
      monthThreshold: warn,
      enabled,
    });
  }

  const error = formError ?? save.error?.message ?? null;

  return (
    <VStack space="lg">
      <HStack className="items-center justify-between rounded-3xl bg-card p-5">
        <VStack className="flex-1 pr-4">
          <Text className="font-semibold text-foreground">
            Monthly data limit
          </Text>
          <Text className="text-sm text-muted-foreground">
            Track usage against your bundle and warn before it runs out.
          </Text>
        </VStack>
        <Switch value={enabled} onValueChange={setEnabled} />
      </HStack>

      <VStack space="lg" className="rounded-3xl bg-card p-5">
        {enabled && (
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Data limit</FormControlLabelText>
            </FormControlLabel>
            <HStack space="sm" className="items-center">
              <Input className="flex-1">
                <InputField
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                  placeholder="20"
                />
              </Input>
              {UNITS.map((u) => (
                <Button
                  key={u}
                  size="sm"
                  variant={unit === u ? "default" : "outline"}
                  onPress={() => setUnit(u)}
                >
                  <ButtonText>{u}</ButtonText>
                </Button>
              ))}
            </HStack>
          </FormControl>
        )}

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Cycle starts on day</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={startDay}
              onChangeText={setStartDay}
              keyboardType="number-pad"
              placeholder="1"
            />
          </Input>
          <FormControlHelper>
            <FormControlHelperText>
              Usage resets on this day each month.
            </FormControlHelperText>
          </FormControlHelper>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Warn at (%)</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
              placeholder="90"
            />
          </Input>
        </FormControl>
      </VStack>

      {error && <Text className="text-sm text-destructive">{error}</Text>}

      <Button
        size="lg"
        className="rounded-full"
        onPress={submit}
        isDisabled={save.isPending}
      >
        {save.isPending && <ButtonSpinner color={colors.primaryForeground} />}
        <ButtonText>{save.isPending ? "Saving…" : "Save"}</ButtonText>
      </Button>

      <Text className="text-center text-xs text-muted-foreground">
        Saved on the MiFi itself, so its web page and AI Life see the same plan.
      </Text>
    </VStack>
  );
}

export default function DataPlanEditor() {
  const colors = useAppColors();
  const router = useRouter();
  const { data: plan, error, refetch } = useDataPlan();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentContainerClassName="px-4 pt-6 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="lg">
          <HStack className="items-center justify-between">
            <Heading size="2xl">Data plan</Heading>
            <Button variant="ghost" onPress={() => router.back()}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </HStack>

          {plan ? (
            <DataPlanForm plan={plan} />
          ) : error ? (
            <VStack space="md">
              <Text className="text-sm text-destructive">
                Couldn&apos;t load the data plan: {error.message}
              </Text>
              <Button variant="outline" onPress={() => void refetch()}>
                <ButtonText>Retry</ButtonText>
              </Button>
            </VStack>
          ) : (
            <ActivityIndicator color={colors.mutedForeground} />
          )}
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
