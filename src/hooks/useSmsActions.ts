import {
  deleteSms,
  formatDeviceDate,
  sendSms,
  setSmsRead,
} from "@/src/api/routes";
import { SmsType, Smstat, type SmsMessage } from "@/src/api/types/sms";
import { useHiLinkClient } from "@/src/hooks/HiLinkProvider";
import { ALL_SMS_QUERY_KEY, type AllSms } from "@/src/hooks/useAllSms";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// The device keeps one session; SMS writes run one at a time.
const SMS_WRITE_SCOPE = { id: "sms-write" };

function useRefreshSms() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries(
        { queryKey: ALL_SMS_QUERY_KEY },
        { cancelRefetch: false },
      ),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
}

export function useMarkRead() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  const refresh = useRefreshSms();
  return useMutation({
    scope: SMS_WRITE_SCOPE,
    mutationFn: async (indexes: number[]) => {
      for (const index of indexes) {
        await setSmsRead(client, index);
      }
    },
    onMutate: (indexes) => {
      const marked = new Set(indexes);
      queryClient.setQueryData<AllSms>(
        ALL_SMS_QUERY_KEY,
        (data) =>
          data && {
            ...data,
            messages: data.messages.map((m) =>
              m.Smstat === Smstat.NEW && marked.has(m.Index)
                ? { ...m, Smstat: Smstat.READ }
                : m,
            ),
          },
      );
    },
    onSettled: refresh,
  });
}

export function useDeleteSms() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  const refresh = useRefreshSms();
  return useMutation({
    scope: SMS_WRITE_SCOPE,
    mutationFn: async (indexes: number[]) => {
      for (const index of indexes) {
        await deleteSms(client, index);
      }
    },
    onMutate: (indexes) => {
      const removed = new Set(indexes);
      queryClient.setQueryData<AllSms>(
        ALL_SMS_QUERY_KEY,
        (data) =>
          data && {
            ...data,
            messages: data.messages.filter((m) => !removed.has(m.Index)),
            reports: data.reports.filter((m) => !removed.has(m.Index)),
          },
      );
    },
    onSettled: refresh,
  });
}

export function useSendSms() {
  const client = useHiLinkClient();
  const queryClient = useQueryClient();
  const refresh = useRefreshSms();
  return useMutation({
    scope: SMS_WRITE_SCOPE,
    mutationFn: ({ phone, text }: { phone: string; text: string }) =>
      sendSms(client, [phone], text),
    onMutate: ({ phone, text }) => {
      const now = new Date();
      const pending: SmsMessage = {
        Index: -now.getTime(),
        Smstat: Smstat.PENDING,
        Phone: phone,
        Content: text,
        Date: formatDeviceDate(now),
        time: now.getTime(),
        Sca: "",
        SaveType: 0,
        Priority: 0,
        SmsType: SmsType.SINGLE,
      };
      queryClient.setQueryData<AllSms>(
        ALL_SMS_QUERY_KEY,
        (data) => data && { ...data, messages: [...data.messages, pending] },
      );
    },
    onSettled: refresh,
  });
}
