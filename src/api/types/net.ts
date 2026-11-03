/**
 * GET /api/net/current-plmn — the mobile network in use.
 * Observed: State=0, FullName="MTN", ShortName="MTN", Numeric="62001"
 * (MCC 620 + MNC 01), Rat=7 (3GPP E-UTRAN / LTE), Spn="".
 */
export interface CurrentPlmn {
  State: number;
  FullName: string;
  ShortName: string;
  /** MCC + MNC, kept as a string to preserve leading zeros. */
  Numeric: string;
  Rat: number;
  Spn: string;
  [key: string]: unknown;
}

export type CurrentPlmnRaw = Record<string, string>;
