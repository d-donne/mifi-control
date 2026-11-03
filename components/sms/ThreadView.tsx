import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { SmsMessage } from "@/src/api/types/sms";
import { formatFullDateTime } from "@/src/api/utils/date";
import { useAllSms } from "@/src/hooks/useAllSms";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useMemo } from "react";
import { RefreshControl } from "react-native";
import { threadMessages } from "./threads";

const BubbleSeparator = () => <Divider className="my-1 bg-transparent" />;

const BubbleSkeleton = ({ outgoing }: { outgoing: boolean }) => (
  <HStack className={outgoing ? "justify-end" : "justify-start"}>
    <Box
      className={
        outgoing
          ? "w-1/2 max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2"
          : "w-1/2 max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2"
      }
    >
      <SkeletonText _lines={2} className="h-4" />
    </Box>
  </HStack>
);

const MessageBubble = memo(function MessageBubble({
  item,
}: {
  item: SmsMessage;
}) {
  const outgoing = item.Smstat === 3 || item.Smstat === 2;
  return (
    <HStack className={outgoing ? "justify-end" : "justify-start"}>
      <Box
        className={
          outgoing
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2"
            : "max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2"
        }
      >
        <Text
          className={
            outgoing
              ? "text-sm text-primary-foreground"
              : "text-sm text-foreground"
          }
        >
          {item.Content || "(no content — multipart part pending)"}
        </Text>
        <Text
          className={
            outgoing
              ? "mt-1 text-right text-[11px] text-primary-foreground/70"
              : "mt-1 text-right text-[11px] text-muted-foreground"
          }
        >
          {formatFullDateTime(item.Date)}
        </Text>
      </Box>
    </HStack>
  );
});

export default function ThreadView({ phone }: { phone: string }) {
  const all = useAllSms();
  const { refetch, isRefetching } = all;
  const partialError = all.data?.error;
  const error = all.error;

  const messages = useMemo(
    () => threadMessages(all.data?.messages ?? [], phone),
    [all.data, phone],
  );

  const renderItem = useCallback(
    ({ item }: { item: SmsMessage }) => <MessageBubble item={item} />,
    [],
  );

  if (all.isPending) {
    return (
      <VStack space="md" className="flex-1 px-4 pt-2 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <BubbleSkeleton key={i} outgoing={i % 2 === 0} />
        ))}
      </VStack>
    );
  }

  // Only replace the whole screen when there's nothing to show — a
  // partial fetch failure shouldn't hide messages already loaded.
  if (error && messages.length === 0) {
    return (
      <VStack space="md" className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-destructive">
          Couldn&apos;t load messages: {String(error)}
        </Text>
        <Button variant="outline" onPress={() => refetch()}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack className="flex-1 px-4 pb-6">
      <FlashList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.Index)}
        ItemSeparatorComponent={BubbleSeparator}
        initialScrollIndex={Math.max(0, messages.length - 1)}
        ListEmptyComponent={
          <Text className="pt-8 text-center text-sm text-muted-foreground">
            No messages with this contact.
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
        ListFooterComponent={
          partialError ? (
            <Text className="py-4 text-center text-xs text-destructive">
              Couldn&apos;t load some messages: {partialError.message}
            </Text>
          ) : null
        }
        style={{ flex: 1 }}
      />
    </VStack>
  );
}
