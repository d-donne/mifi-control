import { DeviceErrorResponse } from "../types";

export class HiLinkError extends Error {
  constructor(
    message: string,
    public readonly code?: number | string,
  ) {
    super(message);
    this.name = "HiLinkError";
  }
}

/**
 * Session/CSRF token error codes. Returned when the session has expired
 * or is invalid; the request should be retried after a token rotation.
 */
export const TOKEN_ERROR_CODES = new Set<number | string>([
  "125001",
  "125002",
  "125003",
]);

export function isErrorResponse(x: unknown): x is DeviceErrorResponse {
  return typeof x === "object" && x !== null && "error" in x;
}
