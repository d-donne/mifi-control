import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { REFERER_PATH } from "./constants";
import {
  LOGIN_ALREADY_LOGGED_IN_CODES,
  LOGIN_LOCKOUT_CODES,
  LOGIN_PASSWORD_CHANGE_CODES,
  LOGIN_WRONG_CREDENTIALS_CODES,
  HiLinkError,
  isErrorResponse,
  isLoginRejection,
  NETWORK_ERROR_CODE,
  SESSION_CLOSED_CODE,
  TOKEN_ERROR_CODES,
} from "./errors";
import type {
  DeviceErrorResponse,
  SessionTokenResponse,
  StateLoginResponse,
} from "./types";
import { encodePassword } from "./utils/crypto";
import { xhrRequest, type XhrResponse } from "./utils/xhr";

/**
 * Extracts every `<meta name="csrf_token" content="...">` value from an
 * HTML string. Returns an array (the CSRF token pool), or [] if none
 * are found.
 */
function extractCsrfTokens(html: string): string[] {
  const re = /<meta\s+name="csrf_token"\s+content="([^"]+)"/gi;
  return [...html.matchAll(re)].map((m) => m[1]);
}

/**
 * Pulls the `SessionID=...` value out of a `Set-Cookie` header. Returns
 * `null` if the header is missing or doesn't contain a SessionID.
 */
function extractSessionIdCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/SessionID=([^;]+)/i);
  return match ? `SessionID=${match[1]}` : null;
}

/**
 * Reads the post-login CSRF token pool from the login response headers.
 * Per Salamek's `refresh_csrf` pattern: prefer the legacy `one` + `two`
 * headers (older firmware), falling back to the full `#`-delimited
 * `__RequestVerificationToken` header (modern firmware).
 */
function extractLoginTokenPool(res: XhrResponse): string[] {
  const one = res.headers.get("__RequestVerificationTokenone");
  if (one) {
    const pool = [one];
    const two = res.headers.get("__RequestVerificationTokentwo");
    if (two) pool.push(two);
    return pool;
  }
  const full = res.headers.get("__RequestVerificationToken");
  return full ? full.split("#").filter(Boolean) : [];
}

function sessionClosedError(): HiLinkError {
  return new HiLinkError("Session closed", SESSION_CLOSED_CODE);
}

export interface LoginGate {
  reachable: boolean;
  /** Minutes until sign-in unlocks; null when it isn't locked. */
  lockedMinutes: number | null;
}

const UNREACHABLE: LoginGate = { reachable: false, lockedMinutes: null };

export class HiLinkClient {
  private readonly baseUrl: string;
  private readonly referer: string;
  private readonly username: string;
  private readonly password: string;

  private cookie: string | null = null;
  private tokenPool: string[] = [];

  /**
   * In-flight login promise. Concurrent request() calls that all discover
   * a dead session share one triggerLogin() instead of each firing their
   * own — Salamek's single-shot retry, adapted to our async transport.
   * Cleared (finally) when the login settles.
   */
  private loginInFlight: Promise<void> | null = null;

  /**
   * Set once the device rejects these credentials (108001/2/6) or starts
   * throttling (108007). The E5576 counts every failed login toward a
   * lockout, so after a rejection this client never logs in again —
   * otherwise each poll's token error would burn another attempt.
   */
  private loginRejection: HiLinkError | null = null;
  private loginRejectionListener: ((e: HiLinkError) => void) | null = null;

  /** Set by close(): no further requests or logins from this client. */
  private closed = false;

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    // The wire is strings; every route module coerces its own numeric
    // fields explicitly at the boundary (see src/api/utils/coerce.ts).
    // Implicit strnum coercion corrupted phone numbers ("024…" → 241…,
    // leading zero eaten before any code ran) and turned all-digit SMS
    // content into numbers, crashing string methods downstream.
    parseTagValue: false,
  });
  private readonly builder = new XMLBuilder({ ignoreAttributes: false });

  // constructor is private to enforce the use of the static connect method
  private constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash if present
    this.referer = `${this.baseUrl}${REFERER_PATH}`;
    this.username = username;
    this.password = password;
  }

  static async connect(
    baseUrl: string,
    username: string,
    password: string,
  ): Promise<HiLinkClient> {
    const client = new HiLinkClient(baseUrl, username, password);
    await client.ensureLoggedIn();
    return client;
  }

  /**
   * Reads the unauthenticated `user/state-login`, so it never spends a login
   * attempt. While sign-in is locked the device reports the wait in minutes.
   */
  static async loginGate(baseUrl: string): Promise<LoginGate> {
    try {
      const res = await xhrRequest(
        `${baseUrl.replace(/\/$/, "")}/api/user/state-login`,
        { timeoutMs: 4_000 },
      );
      const body = await res.text();
      if (!res.ok || !/<State>/.test(body)) return UNREACHABLE;
      const locked = /<lockstatus>1<\/lockstatus>/.test(body);
      const wait = Number(/<remainwaittime>(\d+)</.exec(body)?.[1] ?? 0);
      return {
        reachable: true,
        lockedMinutes: locked ? Math.max(1, wait) : null,
      };
    } catch {
      return UNREACHABLE;
    }
  }

  static async isReachable(baseUrl: string): Promise<boolean> {
    return (await HiLinkClient.loginGate(baseUrl)).reachable;
  }

  /**
   * Warm-session gate (Salamek's User.login without force_new_login).
   * GETs user/state-login with the current cookie: State "0" means the
   * device already considers this session authenticated → skip the full
   * login dance (this is the AI Life "never ask again" behavior).
   * Anything else (logged out, unreachable state endpoint, no cookie yet)
   * falls through to a full triggerLogin().
   */
  private async ensureLoggedIn(): Promise<void> {
    if (this.cookie) {
      try {
        const res = await xhrRequest(`${this.baseUrl}/api/user/state-login`, {
          headers: { Cookie: this.cookie, Referer: this.referer },
        });
        if (res.ok) {
          const data = this.parser.parse(
            await res.text(),
          ) as StateLoginResponse;
          if (data?.response && data.response.State === "0") {
            return;
          }
        }
      } catch {
        // fall through to full login
      }
    }
    await this.triggerLogin();
  }

  /**
   * Single-flight wrapper around triggerLogin. Concurrent callers share
   * the one in-flight login; all resume when it settles.
   */
  private loginOnce(): Promise<void> {
    if (this.closed) return Promise.reject(sessionClosedError());
    if (this.loginRejection) return Promise.reject(this.loginRejection);
    if (!this.loginInFlight) {
      this.loginInFlight = this.triggerLogin()
        .catch((e: unknown) => {
          if (isLoginRejection(e)) {
            this.loginRejection = e;
            this.loginRejectionListener?.(e);
          }
          throw e;
        })
        .finally(() => {
          this.loginInFlight = null;
        });
    }
    return this.loginInFlight;
  }

  /**
   * Called once if the device rejects a mid-session re-login (password
   * changed on the device, or lockout). The client is unusable afterwards.
   */
  onLoginRejected(listener: (e: HiLinkError) => void): void {
    this.loginRejectionListener = listener;
  }

  /**
   * Stops this client: in-flight polls fail with SESSION_CLOSED instead of
   * re-logging in. The device allows one session, so a replaced client
   * must never log in again.
   */
  close(): void {
    this.closed = true;
    this.loginRejectionListener = null;
  }

  /**
   * Best-effort `POST user/logout` (Salamek closes sessions this way), then
   * close(). Never logs in just to log out: skipped when there's no live
   * session or token to use.
   */
  async logout(): Promise<void> {
    const hasSession =
      !this.closed &&
      !this.loginRejection &&
      this.cookie !== null &&
      this.tokenPool.length > 0;
    this.close();
    if (!hasSession) return;
    try {
      await this.request(
        "/api/user/logout",
        { method: "POST", bodyObj: { Logout: 1 } },
        true,
      );
    } catch {
      // The device expires abandoned sessions on its own.
    }
  }

  /**
   * Logs the user in.
   *
   * Strategy (matches Salamek/huawei-lte-api's
   * Session._initialize_csrf_tokens_and_session for the E5576-320):
   *   1. GET the HTML home page. It returns a real `Set-Cookie: SessionID=...`
   *      and one or more `<meta name="csrf_token" content="...">` tags
   *      that form the initial CSRF token pool.
   *   2. POST /api/user/login with the cookie, first pool token, Referer,
   *      and the SHA256-hashed password body.
   *   3. On success, swap the cookie (the device issues a fresh SessionID
   *      post-login) and atomically rotate the pool from the response
   *      headers.
   *
   * `trySesTokInfoFallback` is only reached if the home page scrape
   * yielded no CSRF tokens (older firmware, or a future firmware update
   * that drops the meta tags).
   */
  private async triggerLogin(): Promise<void> {
    const home = await this.fetchHomePage();

    this.tokenPool = extractCsrfTokens(home.body);
    this.cookie = extractSessionIdCookie(home.setCookie);

    if (this.tokenPool.length === 0 || !this.cookie) {
      await this.trySesTokInfoFallback();
    }

    if (this.tokenPool.length === 0) {
      throw new HiLinkError(
        "Login failed: no CSRF tokens available (home page + SesTokInfo both empty)",
      );
    }
    if (!this.cookie) {
      throw new HiLinkError("Login failed: no SessionID cookie available");
    }

    const firstToken = this.tokenPool[0];
    const encodedPassword = await encodePassword(
      this.username,
      this.password,
      firstToken,
    );

    const loginRes = await xhrRequest(`${this.baseUrl}/api/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        Cookie: this.cookie,
        __RequestVerificationToken: firstToken,
        Referer: this.referer,
      },
      body: this.builder.build({
        request: {
          Username: this.username,
          Password: encodedPassword,
          password_type: "4",
        },
      }),
    });

    if (!loginRes.ok) {
      throw new HiLinkError(`Login HTTP ${loginRes.status}`, loginRes.status);
    }

    const loginBody = this.parser.parse(await loginRes.text());
    if (isErrorResponse(loginBody)) {
      const code = String(loginBody.error.code);
      if (LOGIN_ALREADY_LOGGED_IN_CODES.has(code)) {
        // 108003: device says this session is already authenticated.
        // Salamek treats it as success — proceed to pool rotation below.
      } else if (LOGIN_WRONG_CREDENTIALS_CODES.has(code)) {
        throw new HiLinkError(
          `Wrong username or password (code ${code}).`,
          loginBody.error.code,
        );
      } else if (LOGIN_LOCKOUT_CODES.has(code)) {
        throw new HiLinkError(
          `The MiFi is blocking sign-in after too many attempts (code ${code}). Wait a few minutes.`,
          loginBody.error.code,
        );
      } else if (LOGIN_PASSWORD_CHANGE_CODES.has(code)) {
        throw new HiLinkError(
          `The MiFi wants its admin password changed before sign-in (code ${code}).`,
          loginBody.error.code,
        );
      } else {
        throw new HiLinkError(
          `Login failed: ${loginBody.error.message ?? `code ${code}`}`,
          loginBody.error.code,
        );
      }
    }

    const postLoginCookie = extractSessionIdCookie(
      loginRes.headers.get("set-cookie"),
    );
    if (postLoginCookie) {
      this.cookie = postLoginCookie;
    } else if (!this.cookie) {
      throw new HiLinkError("Login succeeded but no SessionID was returned");
    }
    // else: keep the home-page cookie. Some firmware variants don't
    // re-issue Set-Cookie on /api/user/login, but the home-page cookie
    // is still valid post-login.

    this.tokenPool = extractLoginTokenPool(loginRes);
    if (this.tokenPool.length === 0) {
      throw new HiLinkError("Login succeeded but no CSRF tokens were returned");
    }
  }

  /**
   * Fallback for firmware that doesn't expose CSRF tokens on the HTML home
   * page. Builds a pre-login SessionID from the body's `SesInfo` and a
   * single initial token from `TokInfo`.
   */
  private async trySesTokInfoFallback(): Promise<void> {
    const res = await xhrRequest(`${this.baseUrl}/api/webserver/SesTokInfo`);
    if (!res.ok) {
      throw new HiLinkError(
        `SesTokInfo fallback failed: HTTP ${res.status}`,
        res.status,
      );
    }

    const data = this.parser.parse(await res.text()) as SessionTokenResponse;
    const sesInfo = data?.response?.SesInfo;
    const initialToken = data?.response?.TokInfo;

    if (!sesInfo) {
      throw new HiLinkError(
        "SesTokInfo fallback: no SesInfo in response — is this a HiLink device?",
      );
    }

    if (!this.cookie) {
      this.cookie = `SessionID=${sesInfo}`;
    }
    if (this.tokenPool.length === 0 && initialToken) {
      this.tokenPool = [initialToken];
    }
  }

  /**
   * GETs the device's HTML home page. Returns the body and the raw
   * `Set-Cookie` header (if any). Network failures are wrapped in a
   * user-friendly HiLinkError.
   */
  private async fetchHomePage(): Promise<{
    body: string;
    setCookie: string | null;
  }> {
    let res;
    try {
      res = await xhrRequest(`${this.baseUrl}/`);
    } catch (e) {
      throw new HiLinkError(
        `Couldn't reach MiFi at ${this.baseUrl} — are you connected to its Wi-Fi? (${String(e)})`,
        NETWORK_ERROR_CODE,
      );
    }

    if (!res.ok) {
      throw new HiLinkError(
        `Home page returned HTTP ${res.status} — is ${this.baseUrl} really a HiLink device?`,
      );
    }

    return {
      body: await res.text(),
      setCookie: res.headers.get("set-cookie"),
    };
  }

  // ======= TOKEN MANAGEMENT =======

  /**
   * Picks the token for the next request without draining the pool.
   * Per Salamek's Session.post: consume (shift) while more than one
   * token remains, then reuse the last token indefinitely. The pool is
   * replenished from POST response headers (see refreshTokensFromResponse),
   * so the steady state is: shift 2→1 once, reuse 1 forever.
   * Previously this did shift() unconditionally, draining the 2-3 token
   * pool within seconds under polling and forcing a full re-login storm.
   *
   * GET requests only consume when exactly 1 token remains (Salamek's
   * Session.get); with a fuller pool they send no token header at all.
   * Returns the token to attach, or null to send none.
   */
  private pickToken(isGet: boolean): string | null {
    if (isGet && this.tokenPool.length > 1) return null;
    if (this.tokenPool.length > 1) return this.tokenPool.shift()!;
    return this.tokenPool[0] ?? null;
  }

  /**
   * Extracts CSRF tokens from a POST response's headers into the pool.
   * Mirrors Salamek's refresh_csrf: prefer legacy `one` + `two` headers,
   * fall back to `#`-delimited `__RequestVerificationToken`.
   * When refreshCsrf is set (login), the pool is replaced; otherwise the
   * fresh tokens are prepended ahead of the reused last token.
   */
  private refreshTokensFromResponse(res: XhrResponse, replace: boolean): void {
    const fresh = extractLoginTokenPool(res);
    if (fresh.length === 0) return;
    this.tokenPool = replace ? fresh : [...fresh, ...this.tokenPool];
  }

  /**
   * make a request to the HiLink device. automatically handles session refresh and token rotation.
   * Retry policy (Salamek's single-shot shape): at most ONE re-login per
   * call. A token error (125001/125002/125003) triggers one shared
   * single-flight login, then exactly one retry of the original request.
   * Anything else — including a second token error — surfaces to the
   * caller. Login errors (108001/108002/108006/108007) never retry here:
   * triggerLogin throws typed errors and the session store decides.
   */
  private async request<T>(
    path: string,
    opts: {
      method?: "GET" | "POST";
      bodyObj?: Record<string, unknown>;
    } = {},
    retried = false,
  ): Promise<T> {
    const isGet = (opts.method ?? "GET") === "GET";
    const token = this.pickToken(isGet);
    if (!this.cookie) throw new HiLinkError("No session: sign in again");

    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=UTF-8",
      Cookie: this.cookie,
      Referer: this.referer,
    };
    if (token) headers.__RequestVerificationToken = token;

    const body = opts.bodyObj
      ? this.builder.build({ request: opts.bodyObj })
      : undefined;

    const res = await xhrRequest(`${this.baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });

    if ((opts.method ?? "GET") === "POST") {
      this.refreshTokensFromResponse(res, false);
    }

    const parsed = this.parser.parse(await res.text()) as
      | T
      | DeviceErrorResponse;

    if (isErrorResponse(parsed)) {
      if (TOKEN_ERROR_CODES.has(String(parsed.error.code)) && !retried) {
        // Session is dead — an anonymous SesTokInfo refill can't revive it
        // (it would succeed but mint a token for a new anonymous session,
        // not our authed cookie). One shared single-flight re-login with
        // the stored creds, then exactly one retry of the original request.
        await this.loginOnce();
        return this.request<T>(path, opts, true);
      }
      throw new HiLinkError(
        `Device returned error: ${parsed.error.message ?? `code ${parsed.error.code} (no message)`}`,
        parsed.error.code,
      );
    }
    if (!res.ok) {
      throw new HiLinkError(`Device returned HTTP ${res.status}`, res.status);
    }
    return parsed;
  }

  /**
   * Internal transport accessor for route modules under `src/api/routes/`.
   * Not part of the public API — prefer the typed functions in
   * `src/api/routes/*` (e.g. `getMonitoring(client, "status")`).
   *
   * @internal
   */
  requestAs<T>(
    path: string,
    opts: {
      method?: "GET" | "POST";
      bodyObj?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    if (this.closed) return Promise.reject(sessionClosedError());
    return this.request<T>(path, opts);
  }
}
