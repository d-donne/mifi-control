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
 * Login error codes (Salamek's LoginErrorEnum, verified from
 * enums/user.py). 108003 (already logged in) is NOT an error — login
 * should proceed as success. 108007 means the device is counting failed
 * attempts toward lockout: callers must NOT retry automatically.
 */
export const LOGIN_WRONG_CREDENTIALS_CODES = new Set<string>([
  "108001",
  "108002",
  "108006",
]);

export const LOGIN_LOCKOUT_CODES = new Set<string>(["108007"]);

export const LOGIN_ALREADY_LOGGED_IN_CODES = new Set<string>(["108003"]);

/**
 * Session/CSRF token error codes. Returned when the session has expired
 * or is invalid; the request should be retried after a full re-login.
 * Stored as strings — compare with String(code) since fast-xml-parser
 * returns <code> as a number.
 */
export const TOKEN_ERROR_CODES = new Set<string>([
  "125001",
  "125002",
  "125003",
]);

export function isErrorResponse(x: unknown): x is DeviceErrorResponse {
  return typeof x === "object" && x !== null && "error" in x;
}
