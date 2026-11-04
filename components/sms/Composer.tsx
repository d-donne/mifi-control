import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { SendHorizontal } from "lucide-react-native";
import { useState } from "react";
import { smsSegments } from "./threads";

export default function Composer({
  onSend,
  disabled = false,
  autoFocus = false,
  error = null,
}: {
  onSend: (text: string, restore: () => void) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
}) {
  const colors = useAppColors();
  const [text, setText] = useState("");
  const canSend = !disabled && text.trim().length > 0;
  const segments = smsSegments(text);

  const send = () => {
    if (!canSend) return;
    const sent = text;
    setText("");
    onSend(sent, () => setText(sent));
  };

  return (
    <VStack className="gap-1 px-3 pt-1 pb-2">
      {error && (
        <Text className="px-3 text-xs text-destructive">Not sent: {error}</Text>
      )}
      {text.length > 0 && (
        <Text className="px-3 text-[11px] text-muted-foreground">
          {text.length} characters · {segments} SMS
        </Text>
      )}
      <HStack className="items-end gap-2">
        <Input className="h-auto min-h-11 flex-1 rounded-3xl border-0 bg-card px-4">
          <InputField
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Text message"
            autoFocus={autoFocus}
            className="max-h-32 py-2.5"
            textAlignVertical="center"
          />
        </Input>
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          className={
            canSend
              ? "h-11 w-11 items-center justify-center rounded-full bg-primary data-[active=true]:opacity-80"
              : "h-11 w-11 items-center justify-center rounded-full bg-card"
          }
        >
          <SendHorizontal
            size={20}
            color={canSend ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </HStack>
    </VStack>
  );
}
