import type { HiLinkClient } from "@/src/api/main";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useIsFocused } from "expo-router";
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

/**
 * Same API as `useQuery`, except `queryFn` receives the client. Unfocused
 * screens (pager tabs stay mounted) don't poll: the MiFi serves one session.
 */
export function useHiLinkQuery<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError>, "queryFn"> & {
    queryFn: (client: HiLinkClient) => Promise<TData>;
  },
): UseQueryResult<TData, TError> {
  const client = useHiLinkClient();
  const focused = useIsFocused();
  const { queryFn, subscribed = true, ...rest } = options;
  return useQuery<TData, TError>({
    ...rest,
    subscribed: subscribed && focused,
    queryFn: () => queryFn(client),
  } as UseQueryOptions<TData, TError>);
}

/** Same API as `useInfiniteQuery`, except `queryFn` receives the client. */
export function useHiLinkInfiniteQuery<TData, TError = Error>(
  options: Omit<
    UseInfiniteQueryOptions<
      TData,
      TError,
      InfiniteData<TData, number>,
      readonly unknown[],
      number
    >,
    "queryFn"
  > & {
    queryFn: (client: HiLinkClient, pageParam: number) => Promise<TData>;
  },
): UseInfiniteQueryResult<InfiniteData<TData, number>, TError> {
  const client = useHiLinkClient();
  const { queryFn, ...rest } = options;
  return useInfiniteQuery<
    TData,
    TError,
    InfiniteData<TData, number>,
    readonly unknown[],
    number
  >({
    ...rest,
    queryFn: ({ pageParam }) => queryFn(client, pageParam),
  });
}
