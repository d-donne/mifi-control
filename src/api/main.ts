import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { REFERER } from "./constants";
import {
  LOGIN_ALREADY_LOGGED_IN_CODES,
  LOGIN_LOCKOUT_CODES,
  LOGIN_WRONG_CREDENTIALS_CODES,
  HiLinkError,
  isErrorResponse,
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

export class HiLinkClient {
  private readonly baseUrl: string;
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
          headers: { Cookie: this.cookie, Referer: REFERER },
        });
        if (res.ok) {
          const data = this.parser.parse(
            await res.text(),
          ) as StateLoginResponse;
          if (data?.response && String(data.response.State) === "0") {
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
    if (!this.loginInFlight) {
      this.loginInFlight = this.triggerLogin().finally(() => {
        this.loginInFlight = null;
      });
    }
    return this.loginInFlight;
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
        Referer: REFERER,
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
          `Login failed: wrong username or password (device code ${code}) — check Settings, not retrying.`,
          loginBody.error.code,
        );
      } else if (LOGIN_LOCKOUT_CODES.has(code)) {
        throw new HiLinkError(
          `Login failed: device is throttling login attempts (code ${code}) — wait a few minutes before retrying.`,
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

    console.log("post-login cookie:", this.cookie);
    console.log("login set-cookie header:", loginRes.headers.get("set-cookie"));

    this.tokenPool = extractLoginTokenPool(loginRes);
    console.log("post-login token pool size:", this.tokenPool.length);
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
   * Returns the token to use, plus whether the caller should attach it.
   */
  private pickToken(isGet: boolean): { token: string | null; attach: boolean } {
    if (isGet && this.tokenPool.length > 1) {
      return { token: null, attach: false };
    }
    if (this.tokenPool.length > 1)
      return { token: this.tokenPool.shift()!, attach: true };
    const last = this.tokenPool[0] ?? null;
    return { token: last, attach: last !== null };
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
   * Re-hits SesTokInfo to get a single fresh token without a full
   * re-login. Note: unverified whether SesTokInfo called while already
   * authenticated returns a token valid for the existing cookie, or
   * silently starts a new anonymous session. If the refill fails,
   * `request<T>` falls through to a full `triggerLogin()`.
   */
  private async tryRefillFromSesTokInfo(): Promise<boolean> {
    try {
      const res = await xhrRequest(`${this.baseUrl}/api/webserver/SesTokInfo`);
      if (!res.ok) return false;
      const data = this.parser.parse(await res.text()) as SessionTokenResponse;
      if (data.response?.TokInfo) {
        this.tokenPool = [data.response.TokInfo];
        return true;
      }
    } catch {
      // fall through to re-login
    }
    return false;
  }

  /**
   * make a request to the HiLink device. automatically handles session refresh and token rotation.
   * Retry policy (Salamek's single-shot shape): at most ONE re-login per
   * call. A token error (125001/125002/125003) triggers one shared
   * single-flight login, then exactly one retry of the original request.
   * Anything else — including a second token error — surfaces to the
   * caller. Login errors (108001/108002/108006/108007) never retry here:
   * triggerLogin throws typed errors and callers (Settings UI) decide.
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
    let { token, attach } = this.pickToken(isGet);
    if (attach && !token) {
      const refilled = await this.tryRefillFromSesTokInfo();
      if (refilled) ({ token, attach } = this.pickToken(isGet));
      if (attach && !token) {
        await this.loginOnce();
        ({ token, attach } = this.pickToken(isGet));
      }
    }

    if ((attach && !token) || !this.cookie)
      throw new HiLinkError("No valid session after login/refresh attempts");

    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=UTF-8",
      Cookie: this.cookie,
      Referer: REFERER,
    };
    if (attach && token) headers.__RequestVerificationToken = token;

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
    return parsed as T;
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
    return this.request<T>(path, opts);
  }
}
