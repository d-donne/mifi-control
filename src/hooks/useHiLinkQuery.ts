import type { HiLinkClient } from "@/src/api/main";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { useIsFocused } from "expo-router";
import {
  useQuery,
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
