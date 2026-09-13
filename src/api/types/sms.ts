export const BoxType = {
  LOCAL_INBOX: 1,
  LOCAL_SENT: 2,
  LOCAL_DRAFT: 3,
  LOCAL_TRASH: 4,
  SIM_INBOX: 5,
  SIM_SENT: 6,
  SIM_DRAFT: 7,
  MIX_INBOX: 8,
  MIX_SENT: 9,
  MIX_DRAFT: 10,
} as const;
export type BoxType = (typeof BoxType)[keyof typeof BoxType];

export const Smstat = {
  NEW: 0,
  READ: 1,
  PENDING: 2,
  SEND: 3,
  SEND_FAILED: 4,
} as const;
export type Smstat = (typeof Smstat)[keyof typeof Smstat];

export const SmsType = {
  SINGLE: 1,
  MULTIPART: 2,
  UNICODE: 5,
  DELIVERY_SUCCESS: 7,
  DELIVERY_FAILURE: 8,
} as const;
export type SmsType = (typeof SmsType)[keyof typeof SmsType];

export const SortType = {
  DATE: 0,
  PHONE: 1,
  INDEX: 2,
} as const;
export type SortType = (typeof SortType)[keyof typeof SortType];

/** Raw message as parsed from XML — numerics may be string or number. */
export interface RawSmsMessage {
  Index: string | number;
  Smstat: string | number;
  Phone: string;
  Content: string;
  Date: string;
  Sca: string;
  SaveType: string | number;
  Priority: string | number;
  SmsType: string | number;
  [key: string]: unknown;
}

/** Normalized message — numerics coerced. */
export interface SmsMessage {
  Index: number;
  Smstat: number;
  Phone: string;
  Content: string;
  Date: string;
  Sca: string;
  SaveType: number;
  Priority: number;
  SmsType: number;
  [key: string]: unknown;
}

export interface RawSmsListResponse {
  Count: string | number;
  Messages?: {
    Message?: RawSmsMessage | RawSmsMessage[];
  };
  [key: string]: unknown;
}

export interface SmsListResponse {
  Count: number;
  Messages: SmsMessage[];
}

/** `sms-count` keys unverified on this firmware — permissive for now. */
export interface SmsCountResponse {
  [key: string]: unknown;
}
