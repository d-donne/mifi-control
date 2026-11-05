import ConfirmDialog from "@/components/common/ConfirmDialog";
import Placeholder from "@/components/common/Placeholder";
import { useTabBarClearance } from "@/components/TabBar";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatListTime } from "@/src/api/utils";
import { useAllSms, useDeviceNotifications } from "@/src/hooks/useAllSms";
import { useAppColors } from "@/src/hooks/useAppColors";
import { useDeleteSms } from "@/src/hooks/useSmsActions";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { MessageSquare, Search, SquarePen, X } from "@/components/icons";
import { memo, useCallback, useMemo, useState } from "react";
import { RefreshControl } from "react-native";
import ComposeSheet from "./ComposeSheet";
import SenderAvatar from "./SenderAvatar";
import {
  filterThreads,
  groupThreads,
  isOutgoing,
  threadMessages,
  type SmsThread,
} from "./threads";

const FAB_SIZE = 56;

function previewText(thread: SmsThread): string {
  const content =
    thread.lastMessage.Content.trim() || "Message still arriving…";
  return isOutgoing(thread.lastMessage) ? `You: ${content}` : content;
}

const ThreadRow = memo(function ThreadRow({
  item,
  onLongPress,
}: {
  item: SmsThread;
  onLongPress: (thread: SmsThread) => void;
}) {
  const router = useRouter();
  const unread = item.unreadCount > 0;
  const preview = previewText(item);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/conversation/[phone]",
          params: { phone: item.phone },
        })
      }
      onLongPress={() => onLongPress(item)}
      accessibilityHint="Long press to delete the conversation"
      accessibilityRole="button"
      accessibilityLabel={`${item.phone}${unread ? `, ${item.unreadCount} unread` : ""}. ${preview}`}
      className="flex-row items-center gap-3 rounded-2xl px-3 py-3 data-[active=true]:bg-card"
    >
      <SenderAvatar name={item.phone} />
      <VStack className="flex-1 gap-0.5">
        <HStack className="items-baseline gap-2">
          <Text
            numberOfLines={1}
            className={
              unread
                ? "flex-1 text-base font-semibold text-foreground"
                : "flex-1 text-base font-medium text-foreground"
            }
          >
            {item.phone}
          </Text>
          <Text
            className={
              unread
                ? "text-xs font-semibold text-accent"
                : "text-xs text-muted-foreground"
            }
          >
            {formatListTime(item.lastMessage.time)}
          </Text>
        </HStack>
        <HStack className="items-start gap-2">
          <Text
            numberOfLines={2}
            className={
              unread
                ? "flex-1 text-sm text-foreground"
                : "flex-1 text-sm text-muted-foreground"
            }
          >
            {preview}
          </Text>
          {unread && (
            <Box className="mt-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
              <Text className="text-[11px] font-bold text-primary-foreground">
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </Box>
          )}
        </HStack>
      </VStack>
    </Pressable>
  );
});

function RowSkeleton() {
  return (
    <HStack className="items-center gap-3 px-3 py-3">
      <Placeholder width={44} height={44} radius={22} />
      <VStack className="flex-1 gap-2">
        <Placeholder width="40%" height={14} />
        <Placeholder width="80%" height={12} />
      </VStack>
    </HStack>
  );
}

function EmptyState({ search }: { search: string }) {
  const colors = useAppColors();
  return (
    <VStack className="items-center gap-2 px-8 pt-16">
      <MessageSquare size={28} color={colors.mutedForeground} />
      <Text className="text-center font-medium text-foreground">
        {search ? `Nothing matches “${search}”` : "No messages yet"}
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {search
          ? "Search looks at sender names, numbers and message text."
          : "Texts sent to the SIM in your MiFi show up here."}
      </Text>
    </VStack>
  );
}

export default function SmsList() {
  const colors = useAppColors();
  const clearance = useTabBarClearance();
  const [search, setSearch] = useState("");

  const all = useAllSms();
  const partialError = all.data?.error;
  const storageFull = useDeviceNotifications().data?.SmsStorageFull === 1;

  const threads = useMemo(
    () => groupThreads(all.data?.messages ?? []),
    [all.data],
  );
  const visible = useMemo(
    () => filterThreads(threads, all.data?.messages ?? [], search),
    [threads, all.data, search],
  );
  const unreadTotal = useMemo(
    () => threads.reduce((sum, t) => sum + t.unreadCount, 0),
    [threads],
  );

  const [deleting, setDeleting] = useState<SmsThread | null>(null);
  const [composing, setComposing] = useState(false);
  const { mutate: deleteMessages } = useDeleteSms();
  const confirmDelete = () => {
    if (!deleting) return;
    const thread = [
      ...threadMessages(all.data?.messages ?? [], deleting.phone),
      ...threadMessages(all.data?.reports ?? [], deleting.phone),
    ];
    deleteMessages(thread.map((m) => m.Index));
  };

  const renderItem = useCallback(
    ({ item }: { item: SmsThread }) => (
      <ThreadRow item={item} onLongPress={setDeleting} />
    ),
    [],
  );

  const summary = all.data
    ? `${threads.length} conversations${unreadTotal > 0 ? ` · ${unreadTotal} unread` : ""}`
    : "Loading messages…";

  return (
    <VStack className="flex-1">
      <VStack className="gap-3 px-4 pt-2 pb-2">
        <VStack>
          <Heading size="2xl">SMS</Heading>
          <Text className="text-sm text-muted-foreground">{summary}</Text>
        </VStack>
        <Input className="h-11 rounded-full border-0 bg-card px-4">
          <InputSlot>
            <Search size={16} color={colors.mutedForeground} />
          </InputSlot>
          <InputField
            placeholder="Search messages"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <InputSlot
              onPress={() => setSearch("")}
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <X size={16} color={colors.mutedForeground} />
            </InputSlot>
          )}
        </Input>
        {storageFull && (
          <VStack className="rounded-2xl bg-destructive/15 px-4 py-3">
            <Text className="text-sm font-semibold text-destructive">
              SMS storage is full
            </Text>
            <Text className="text-xs text-foreground">
              The MiFi can&apos;t receive new texts until some are deleted.
            </Text>
          </VStack>
        )}
      </VStack>

      {all.isPending ? (
        <VStack className="px-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </VStack>
      ) : all.error && threads.length === 0 ? (
        <VStack className="items-center gap-3 px-8 pt-16">
          <Text className="text-center text-sm text-foreground">
            Couldn&apos;t load messages.
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
          data={visible}
          renderItem={renderItem}
          keyExtractor={(item) => item.normalizedPhone}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingBottom: clearance + FAB_SIZE + 16,
          }}
          ListEmptyComponent={<EmptyState search={search.trim()} />}
          refreshControl={
            <RefreshControl
              refreshing={all.isRefetching}
              onRefresh={() => void all.refetch()}
            />
          }
          ListFooterComponent={
            visible.length > 0 ? (
              <Text
                className={
                  partialError
                    ? "px-6 py-4 text-center text-xs text-destructive"
                    : "px-6 py-4 text-center text-xs text-muted-foreground"
                }
              >
                {partialError
                  ? `Some messages couldn't be loaded: ${partialError.message}`
                  : `${all.data?.inboxCount ?? 0} received · ${all.data?.sentCount ?? 0} sent`}
              </Text>
            ) : null
          }
        />
      )}
      <Pressable
        onPress={() => setComposing(true)}
        accessibilityRole="button"
        accessibilityLabel="New message"
        className="absolute right-5 items-center justify-center rounded-2xl bg-primary shadow-lg data-[active=true]:opacity-80"
        style={{ bottom: clearance + 8, width: FAB_SIZE, height: FAB_SIZE }}
      >
        <SquarePen size={22} color={colors.primaryForeground} />
      </Pressable>
      <ComposeSheet visible={composing} onClose={() => setComposing(false)} />
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete conversation?"
        message={
          deleting
            ? `${deleting.count === 1 ? "1 message" : `${deleting.count} messages`} with ${deleting.phone} will be removed from the MiFi.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </VStack>
  );
}
