import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { SmsMessage } from "@/src/api/types/sms";
import { formatFullDateTime } from "@/src/api/utils/date";
import { useAppColors } from "@/src/hooks/useAppColors";
import * as Clipboard from "expo-clipboard";
import { Copy, Trash2 } from "@/components/icons";
import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copyableNumbers } from "./threads";

export default function MessageActions({
  message,
  onClose,
  onDelete,
}: {
  message: SmsMessage | null;
  onClose: () => void;
  onDelete: (message: SmsMessage) => void;
}) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const content = message?.Content.trim() ?? "";
  const numbers = copyableNumbers(content);

  const copy = (text: string) => {
    void Clipboard.setStringAsync(text);
    onClose();
  };

  return (
    <Modal
      visible={message !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityLabel="Close"
        />
        {message && (
          <VStack
            className="gap-4 rounded-t-3xl bg-card px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="h-1 w-10 self-center rounded-full bg-muted-foreground/40" />
            <Text className="text-xs text-muted-foreground">
              {formatFullDateTime(message.time)}
            </Text>
            {content ? (
              <ScrollView
                className="rounded-2xl bg-background"
                style={{ maxHeight: 220 }}
                contentContainerClassName="p-3.5"
              >
                <Text
                  selectable
                  className="text-[15px] leading-5 text-foreground"
                >
                  {content}
                </Text>
              </ScrollView>
            ) : null}

            {numbers.length > 0 && (
              <HStack className="flex-wrap gap-2">
                {numbers.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => copy(value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy ${value}`}
                    className="flex-row items-center gap-1.5 rounded-full bg-background px-3.5 py-2 data-[active=true]:opacity-70"
                  >
                    <Copy size={14} color={colors.primary} />
                    <Text className="text-sm font-medium text-foreground">
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            )}

            <VStack>
              {content ? (
                <Pressable
                  onPress={() => copy(content)}
                  accessibilityRole="button"
                  className="flex-row items-center gap-3 rounded-2xl px-2 py-3.5 data-[active=true]:bg-background"
                >
                  <Copy size={20} color={colors.foreground} />
                  <Text className="text-base text-foreground">Copy text</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  onClose();
                  onDelete(message);
                }}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-2xl px-2 py-3.5 data-[active=true]:bg-background"
              >
                <Trash2 size={20} color={colors.destructive} />
                <Text className="text-base text-destructive">Delete</Text>
              </Pressable>
            </VStack>
          </VStack>
        )}
      </View>
    </Modal>
  );
}
