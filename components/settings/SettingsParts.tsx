import { ChevronRight } from "@/components/icons";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      {title && (
        <Text className="px-1 text-sm font-medium text-muted-foreground">
          {title}
        </Text>
      )}
      <VStack className="rounded-2xl bg-card px-5 py-2">{children}</VStack>
    </VStack>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <HStack className="items-center justify-between py-2.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text
        className="ml-4 flex-1 text-right text-sm text-foreground"
        numberOfLines={1}
        selectable
      >
        {value || "—"}
      </Text>
    </HStack>
  );
}

export function NavRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="flex-row items-center py-3 data-[active=true]:opacity-70"
    >
      <Text className="flex-1 text-sm text-foreground">{label}</Text>
      {value && (
        <Text
          className="ml-4 shrink text-sm text-muted-foreground"
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function SettingsSheet({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
      <VStack space="lg">
        <HStack className="items-center">
          <Heading size="xl" className="flex-1">
            {title}
          </Heading>
          <Button variant="ghost" onPress={() => router.back()}>
            <ButtonText>Done</ButtonText>
          </Button>
        </HStack>
        {children}
      </VStack>
    </ScrollView>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <HStack className="gap-1 rounded-full bg-secondary p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => !selected && onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-full py-2 ${selected ? "bg-primary" : "data-[active=true]:bg-card"}`}
          >
            <Text
              className={`text-sm font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
