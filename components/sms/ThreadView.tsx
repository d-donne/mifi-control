import ConfirmDialog from "@/components/common/ConfirmDialog";
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
} from "@/src/api/utils/date";
import { useAllSms } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import {
  useDeleteSms,
  useMarkRead,
  useSendSms,
} from "@/src/hooks/useSmsActions";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, RefreshControl } from "react-native";
import Composer from "./Composer";
import MessageActions from "./MessageActions";
import SenderAvatar from "./SenderAvatar";
import {
  canReply,
  deliveryByIndex,
  isOutgoing,
  threadMessages,
  type Delivery,
} from "./threads";

/** Same-side messages closer together than this read as one burst. */
const GROUP_GAP_MS = 5 * 60_000;

interface MessageItem {
  type: "message";
  key: string;
  message: SmsMessage;
  outgoing: boolean;
  /** Follows a same-side message within GROUP_GAP_MS. */
  grouped: boolean;
  status: string | null;
  failed: boolean;
}

type ThreadItem = { type: "day"; key: string; label: string } | MessageItem;

function buildItems(
  messages: SmsMessage[],
  delivery: Map<number, Delivery>,
): ThreadItem[] {
  const items: ThreadItem[] = [];
  let lastOutgoing = -1;
  messages.forEach((m, i) => {
    if (isOutgoing(m)) lastOutgoing = i;
  });
  let previous: SmsMessage | null = null;
  let previousDay: string | null = null;
  for (const [position, message] of messages.entries()) {
    const day = new Date(message.time).toDateString();
    const newDay = day !== previousDay;
    if (newDay) {
      items.push({
        type: "day",
        key: `day-${day}`,
        label: formatDayLabel(message.time),
      });
    }
    const outgoing = isOutgoing(message);
    const gap = previous === null ? Infinity : message.time - previous.time;
    const status = statusLabel(
      message,
      delivery.get(message.Index),
      position === lastOutgoing,
    );
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
      status,
      failed:
        message.Smstat === Smstat.SEND_FAILED ||
        delivery.get(message.Index) === "undelivered",
    });
    previous = message;
    previousDay = day;
  }
  return items;
}

function statusLabel(
  message: SmsMessage,
  delivery: Delivery | undefined,
  latest: boolean,
): string | null {
  if (message.Smstat === Smstat.PENDING) return "Sending…";
  if (message.Smstat === Smstat.SEND_FAILED) return "Not sent";
  if (delivery === "undelivered") return "Not delivered";
  if (delivery === "delivered" && latest) return "Delivered";
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
  onLongPress,
}: {
  item: MessageItem;
  onLongPress: (message: SmsMessage) => void;
}) {
  const { message, outgoing, grouped, status, failed } = item;
  const content = message.Content.trim();

  return (
    <VStack
      className={outgoing ? "items-end" : "items-start"}
      style={{ marginTop: grouped ? 3 : 12 }}
    >
      <Pressable
        onLongPress={() => onLongPress(message)}
        accessibilityHint="Long press for copy and delete"
        accessibilityLabel={`${outgoing ? "Sent" : "Received"} ${formatFullDateTime(message.time)}: ${content || "message still arriving"}${status ? `. ${status}` : ""}`}
        className={
          outgoing
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 data-[active=true]:opacity-80"
            : "max-w-[80%] rounded-2xl rounded-bl-md bg-card px-3.5 py-2 data-[active=true]:opacity-80"
        }
      >
        {content ? (
          <Text
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
          {formatClockTime(message.time)}
        </Text>
      </Pressable>
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
  const router = useRouter();
  const all = useAllSms();
  const partialError = all.data?.error;

  const messages = useMemo(
    () => threadMessages(all.data?.messages ?? [], phone),
    [all.data, phone],
  );
  const reports = useMemo(
    () => threadMessages(all.data?.reports ?? [], phone),
    [all.data, phone],
  );
  const items = useMemo(
    () => buildItems(messages, deliveryByIndex(messages, reports)),
    [messages, reports],
  );

  const { mutate: markRead } = useMarkRead();
  const requestedRead = useRef(new Set<number>());
  useEffect(() => {
    const unread = [...messages, ...reports]
      .filter(
        (m) => m.Smstat === Smstat.NEW && !requestedRead.current.has(m.Index),
      )
      .map((m) => m.Index);
    if (unread.length === 0) return;
    for (const index of unread) requestedRead.current.add(index);
    markRead(unread);
  }, [messages, reports, markRead]);

  const [actionsFor, setActionsFor] = useState<SmsMessage | null>(null);
  const [deleting, setDeleting] = useState<SmsMessage | null>(null);
  const { mutate: deleteMessages } = useDeleteSms();
  const confirmDelete = () => {
    if (!deleting) return;
    deleteMessages([deleting.Index]);
    if (messages.length === 1) router.back();
  };

  const { mutate: send } = useSendSms();

  const renderItem = useCallback(
    ({ item }: { item: ThreadItem }) =>
      item.type === "day" ? (
        <DaySeparator label={item.label} />
      ) : (
        <MessageBubble item={item} onLongPress={setActionsFor} />
      ),
    [],
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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
          maintainVisibleContentPosition={{
            startRenderingFromBottom: true,
            autoscrollToBottomThreshold: 0.2,
          }}
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
      {canReply(phone) && (
        <Composer
          disabled={!all.data}
          onSend={(text, restore) =>
            send({ phone, text }, { onError: restore })
          }
        />
      )}
      <MessageActions
        message={actionsFor}
        onClose={() => setActionsFor(null)}
        onDelete={setDeleting}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete message?"
        message="It will be removed from the MiFi."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </KeyboardAvoidingView>
  );
}
