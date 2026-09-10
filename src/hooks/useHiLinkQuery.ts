import type { HiLinkClient } from "@/src/api/main";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import {
  useQuery,
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
