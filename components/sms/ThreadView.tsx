import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Smstat, type SmsMessage } from "@/src/api/types/sms";
import {
  formatClockTime,
  formatDayLabel,
  formatFullDateTime,
  parseDeviceDate,
} from "@/src/api/utils/date";
import { useAllSms } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { memo, useCallback, useMemo } from "react";
import { RefreshControl } from "react-native";
import SenderAvatar from "./SenderAvatar";
import { isOutgoing, threadMessages } from "./threads";

/** Same-side messages closer together than this read as one burst. */
const GROUP_GAP_MS = 5 * 60_000;

interface MessageItem {
  type: "message";
  key: string;
  message: SmsMessage;
  outgoing: boolean;
  /** Follows a same-side message within GROUP_GAP_MS. */
  grouped: boolean;
}

type ThreadItem = { type: "day"; key: string; label: string } | MessageItem;

function buildItems(messages: SmsMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];
  let previous: SmsMessage | null = null;
  for (const message of messages) {
    const day = message.Date.slice(0, 10);
    const newDay = previous === null || previous.Date.slice(0, 10) !== day;
    if (newDay) {
      items.push({
        type: "day",
        key: `day-${day}`,
        label: formatDayLabel(message.Date),
      });
    }
    const outgoing = isOutgoing(message);
    const gap =
      previous === null
        ? Infinity
        : (parseDeviceDate(message.Date)?.getTime() ?? 0) -
          (parseDeviceDate(previous.Date)?.getTime() ?? 0);
    items.push({
      type: "message",
      key: String(message.Index),
      message,
      outgoing,
      grouped:
        !newDay &&
        previous !== null &&
        isOutgoing(previous) === outgoing &&
        gap < GROUP_GAP_MS,
    });
    previous = message;
  }
  return items;
}

function statusLabel(message: SmsMessage): string | null {
  if (message.Smstat === Smstat.PENDING) return "Sending…";
  if (message.Smstat === Smstat.SEND_FAILED) return "Not sent";
  return null;
}

function DaySeparator({ label }: { label: string }) {
  return (
    <HStack className="justify-center pt-6 pb-1">
      <Text className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
        {label}
      </Text>
    </HStack>
  );
}

const MessageBubble = memo(function MessageBubble({
  item,
}: {
  item: MessageItem;
}) {
  const { message, outgoing, grouped } = item;
  const content = message.Content.trim();
  const status = statusLabel(message);
  const failed = message.Smstat === Smstat.SEND_FAILED;

  return (
    <VStack
      className={outgoing ? "items-end" : "items-start"}
      style={{ marginTop: grouped ? 3 : 12 }}
    >
      <VStack
        accessible
        accessibilityLabel={`${outgoing ? "Sent" : "Received"} ${formatFullDateTime(message.Date)}: ${content || "message still arriving"}${status ? `. ${status}` : ""}`}
        className={
          outgoing
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2"
            : "max-w-[80%] rounded-2xl rounded-bl-md bg-card px-3.5 py-2"
        }
      >
        {content ? (
          <Text
            selectable
            className={
              outgoing
                ? "text-[15px] leading-5 text-primary-foreground"
                : "text-[15px] leading-5 text-foreground"
            }
          >
            {content}
          </Text>
        ) : (
          <Text
            className={
              outgoing
                ? "text-sm text-primary-foreground/80 italic"
                : "text-sm text-muted-foreground italic"
            }
          >
            Message still arriving…
          </Text>
        )}
        <Text
          className={
            outgoing
              ? "mt-1 self-end text-[11px] text-primary-foreground/75"
              : "mt-1 self-end text-[11px] text-muted-foreground"
          }
        >
          {formatClockTime(message.Date)}
        </Text>
      </VStack>
      {status && (
        <Text
          className={
            failed
              ? "mt-1 text-[11px] font-medium text-destructive"
              : "mt-1 text-[11px] text-muted-foreground"
          }
        >
          {status}
        </Text>
      )}
    </VStack>
  );
});

function ThreadHeader({ phone, count }: { phone: string; count?: number }) {
  const router = useRouter();
  const colors = useAppColors();
  return (
    <HStack className="items-center gap-2 px-2 pt-1 pb-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to messages"
        className="h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-card"
      >
        <ChevronLeft size={24} color={colors.foreground} />
      </Pressable>
      <SenderAvatar name={phone} size={36} />
      <VStack className="flex-1">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-foreground"
        >
          {phone}
        </Text>
        {count !== undefined && (
          <Text className="text-xs text-muted-foreground">
            {count === 1 ? "1 message" : `${count} messages`}
          </Text>
        )}
      </VStack>
    </HStack>
  );
}

function BubbleSkeleton({ outgoing }: { outgoing: boolean }) {
  return (
    <VStack className={outgoing ? "items-end" : "items-start"}>
      <Skeleton className="mt-3 h-14 w-3/5 rounded-2xl" />
    </VStack>
  );
}

export default function ThreadView({ phone }: { phone: string }) {
  const all = useAllSms();
  const partialError = all.data?.error;

  const messages = useMemo(
    () => threadMessages(all.data?.messages ?? [], phone),
    [all.data, phone],
  );
  const items = useMemo(() => buildItems(messages), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ThreadItem }) =>
      item.type === "day" ? (
        <DaySeparator label={item.label} />
      ) : (
        <MessageBubble item={item} />
      ),
    [],
  );

  return (
    <VStack className="flex-1">
      <ThreadHeader
        phone={phone}
        count={all.data ? messages.length : undefined}
      />

      {all.isPending ? (
        <VStack className="px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BubbleSkeleton key={i} outgoing={i % 3 === 2} />
          ))}
        </VStack>
      ) : all.error && messages.length === 0 ? (
        <VStack className="items-center gap-3 px-8 pt-16">
          <Text className="text-center text-sm text-foreground">
            Couldn&apos;t load this conversation.
          </Text>
          <Text className="text-center text-xs text-muted-foreground">
            {all.error.message}
          </Text>
          <Button variant="outline" onPress={() => void all.refetch()}>
            <ButtonText>Try again</ButtonText>
          </Button>
        </VStack>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item.type}
          initialScrollIndex={Math.max(0, items.length - 1)}
          maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
          ListEmptyComponent={
            <Text className="pt-16 text-center text-sm text-muted-foreground">
              No messages with {phone}.
            </Text>
          }
          ListFooterComponent={
            partialError ? (
              <Text className="pt-4 text-center text-xs text-destructive">
                Some messages couldn&apos;t be loaded: {partialError.message}
              </Text>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={all.isRefetching}
              onRefresh={() => void all.refetch()}
            />
          }
        />
      )}
    </VStack>
  );
}
