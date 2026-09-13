import type { HiLinkClient } from "@/src/api/main";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

/** Same API as `useQuery`, except `queryFn` receives the client. */
export function useHiLinkQuery<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError>, "queryFn"> & {
    queryFn: (client: HiLinkClient) => Promise<TData>;
  },
): UseQueryResult<TData, TError> {
  const client = useHiLinkClient();
  const { queryFn, ...rest } = options;
  return useQuery<TData, TError>({
    ...rest,
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

