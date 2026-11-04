import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAllSms } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useSendSms } from "@/src/hooks/useSmsActions";
import { useRouter } from "expo-router";
import { X } from "@/components/icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Composer from "./Composer";
import SenderAvatar from "./SenderAvatar";
import { canReply, groupThreads } from "./threads";

/** "+233 24…", "233 24…" and "024…" all become "24…"; short codes stay. */
function nationalNumber(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^(?:233|0)/, "");
}

function ComposeForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const all = useAllSms();
  const [phone, setPhone] = useState("");
  const { mutate: send, isPending, error } = useSendSms();

  const recipient = phone.replace(/[\s-]/g, "");
  const valid = canReply(recipient);

  const suggestions = useMemo(
    () =>
      groupThreads(all.data?.messages ?? [])
        .filter(
          (t) =>
            canReply(t.phone) &&
            nationalNumber(t.phone).startsWith(nationalNumber(recipient)),
        )
        .slice(0, 12),
    [all.data, recipient],
  );

  const openConversation = (to: string) => {
    onClose();
    router.push({ pathname: "/conversation/[phone]", params: { phone: to } });
  };

  return (
    <VStack
      className="gap-3 rounded-t-3xl bg-background pt-3"
      style={{ paddingBottom: insets.bottom + 4 }}
    >
      <View className="h-1 w-10 self-center rounded-full bg-muted-foreground/40" />
      <HStack className="items-center justify-between px-5">
        <Text className="text-lg font-semibold text-foreground">
          New message
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-card"
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      </HStack>

      <HStack className="items-center gap-3 px-4">
        <Text className="pl-1 text-sm text-muted-foreground">To</Text>
        <Input className="h-11 flex-1 rounded-full border-0 bg-card px-4">
          <InputField
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
          />
        </Input>
      </HStack>

      {suggestions.length > 0 && (
        <ScrollView
          style={{ maxHeight: 200 }}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-2"
        >
          {suggestions.map((thread) => (
            <Pressable
              key={thread.normalizedPhone}
              onPress={() => openConversation(thread.phone)}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${thread.phone}`}
              className="flex-row items-center gap-3 rounded-2xl px-3 py-2 data-[active=true]:bg-card"
            >
              <SenderAvatar name={thread.phone} size={34} />
              <Text className="text-base text-foreground">{thread.phone}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Composer
        disabled={!valid || isPending}
        error={error?.message}
        onSend={(text, restore) =>
          send(
            { phone: recipient, text },
            {
              onSuccess: () => openConversation(recipient),
              onError: restore,
            },
          )
        }
      />
    </VStack>
  );
}

export default function ComposeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={onClose}
            accessibilityLabel="Close"
          />
          {visible && <ComposeForm onClose={onClose} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
