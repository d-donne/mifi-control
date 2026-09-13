import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatFullDateTime } from "@/src/api/utils/date";
import { useAllSms } from "@/src/hooks/useAllSms";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { RefreshControl, TextInput } from "react-native";
import { filterThreads, groupThreads, type SmsThread } from "./threads";

const ThreadRow = memo(function ThreadRow({ item }: { item: SmsThread }) {
  const router = useRouter();
  const { lastMessage } = item;
  return (
    <Button
      variant="outline"
      className="justify-start border-border bg-card rounded-xl px-4 py-3"
      onPress={() =>
        router.push({
          pathname: "/thread/[phone]",
          params: { phone: item.phone },
        })
      }
    >
      <HStack space="sm" className="flex-1 items-start">
        {item.unreadCount > 0 && (
          <Box className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
        )}
        <VStack space="xs" className="flex-1">
          <HStack className="items-baseline justify-between">
            <Text className="font-semibold text-foreground">{item.phone}</Text>
            <Text className="text-xs text-muted-foreground">
              {formatFullDateTime(lastMessage.Date)}
            </Text>
          </HStack>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {lastMessage.Content}
          </Text>
        </VStack>
        {item.unreadCount > 0 && (
          <Box className="rounded-full bg-primary px-2 py-0.5">
            <Text className="text-xs font-semibold text-primary-foreground">
              {item.unreadCount}
            </Text>
          </Box>
        )}
      </HStack>
    </Button>
  );
});

export default function SmsList() {
  const [search, setSearch] = useState("");

  const all = useAllSms();
  // Partial failure from inside the page loop (non-fatal).
  const partialError = all.data?.error;
  // Hard failure only — the queryFn tolerates per-page errors.
  const error = all.error;

  const threads = useMemo(
    () => groupThreads(all.data?.messages ?? []),
    [all.data],
  );
  const visible = useMemo(() => filterThreads(threads, search), [threads, search]);

  const renderItem = useCallback(
    ({ item }: { item: SmsThread }) => <ThreadRow item={item} />,
    [],
  );

  if (all.isPending) {
    return (
      <VStack space="sm" className="flex-1 px-4 pt-2">
        <SkeletonText _lines={4} className="h-16 bg-card rounded-xl" />
      </VStack>
    );
  }

  // Only replace the whole screen when there's nothing to show — a
  // partial fetch failure shouldn't hide the messages already loaded.
  if (error && threads.length === 0) {
    return (
      <VStack space="md" className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-destructive text-center">
          Couldn&apos;t load messages: {String(error)}
        </Text>
        <Button variant="outline" onPress={() => all.refetch()}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="flex-1 px-4 pb-28">
      <TextInput
        placeholder="Search messages"
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        className="mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground"
      />
      <FlashList
        data={visible}
        renderItem={renderItem}
        keyExtractor={(item) => item.normalizedPhone}
        ItemSeparatorComponent={() => <Box className="h-2" />}
        ListEmptyComponent={
          <Text className="text-sm text-muted-foreground text-center pt-8">
            {search ? "No matching messages." : "No messages yet."}
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={all.isRefetching} onRefresh={all.refetch} />
        }
        ListFooterComponent={
          partialError ? (
            <Text className="text-xs text-destructive text-center py-4">
              Couldn&apos;t load some messages: {String(partialError)}
            </Text>
          ) : (
            <Text className="text-xs text-muted-foreground text-center py-4">
              {all.data
                ? `${all.data.inboxCount} received · ${all.data.sentCount} sent`
                : ""}
            </Text>
          )
        }
        style={{ flex: 1 }}
      />
    </VStack>
  );
}

