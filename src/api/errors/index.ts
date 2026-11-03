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

/** 115002: the device refuses login until its admin password is changed. */
export const LOGIN_PASSWORD_CHANGE_CODES = new Set<string>(["115002"]);

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

/** Client-side codes for HiLinkErrors that don't come from the device. */
export const NETWORK_ERROR_CODE = "NETWORK";
export const SESSION_CLOSED_CODE = "SESSION_CLOSED";

export function isErrorResponse(x: unknown): x is DeviceErrorResponse {
  return typeof x === "object" && x !== null && "error" in x;
}

/**
 * The device refused the login (wrong user/password, lockout, or a forced
 * password change). Every further login attempt counts toward the
 * device's lockout, so these must never be retried automatically.
 */
export function isLoginRejection(e: unknown): e is HiLinkError {
  if (!(e instanceof HiLinkError) || e.code === undefined) return false;
  const code = String(e.code);
  return (
    LOGIN_WRONG_CREDENTIALS_CODES.has(code) ||
    LOGIN_LOCKOUT_CODES.has(code) ||
    LOGIN_PASSWORD_CHANGE_CODES.has(code)
  );
}
