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
 * session/CSRF token error codes. These are returned when the session 
 * has expired or is invalid and are retryable
 */
export const TOKEN_ERROR_CODES = new Set<number | string>([
  "125001",
  "125002",
  "125003",
]);

export const ERROR_CODES = {
  "108001": {
    message: "username wrong",
  },
};

export function isErrorResponse(x: unknown): x is DeviceErrorResponse {
  return typeof x === "object" && x !== null && "error" in x;
}
