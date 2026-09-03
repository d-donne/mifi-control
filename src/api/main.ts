import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { REFERER } from "./constants";
import { HiLinkError, isErrorResponse, TOKEN_ERROR_CODES } from "./errors";
import type {
  DeviceErrorResponse,
  DeviceInfo,
  MonitoringStatus,
  SessionTokenResponse,
  TrafficStats,
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

  private readonly parser = new XMLParser({ ignoreAttributes: false });
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
    await client.triggerLogin();
    return client;
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
      throw new HiLinkError(
        `Login failed: ${loginBody.error.message}`,
        loginBody.error.code,
      );
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
      throw new HiLinkError(
        "Login succeeded but no CSRF tokens were returned",
      );
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
   * Returns the next available token from the pool, or null if the pool is empty.
   */
  private nextToken(): string | null {
    return this.tokenPool.shift() ?? null;
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
   */
  private async request<T>(
    path: string,
    opts: {
      method?: "GET" | "POST";
      bodyObj?: Record<string, unknown>;
    } = {},
    attempt = 0,
  ): Promise<T> {
    if (attempt > 2)
      throw new HiLinkError(
        "Exhausted retries: refill and re-login both failed",
      );

    let token = this.nextToken();
    if (!token) {
      const refilled = await this.tryRefillFromSesTokInfo();
      token = refilled ? this.nextToken() : null;
      if (!token) {
        await this.triggerLogin();
        token = this.nextToken();
      }
    }

    if (!token || !this.cookie)
      throw new HiLinkError("No valid session after login/refresh attempts");

    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=UTF-8",
      Cookie: this.cookie,
      __RequestVerificationToken: token,
      Referer: REFERER,
    };

    const body = opts.bodyObj
      ? this.builder.build({ request: opts.bodyObj })
      : undefined;

    const res = await xhrRequest(`${this.baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });

    const parsed = this.parser.parse(await res.text()) as
      | T
      | DeviceErrorResponse;

    if (isErrorResponse(parsed)) {
      if (TOKEN_ERROR_CODES.has(parsed.error.code)) {
        this.tokenPool = []; // force refill on retry
        return this.request<T>(path, opts, attempt + 1);
      }
      throw new HiLinkError(
        `Device returned error: ${parsed.error.message}`,
        parsed.error.code,
      );
    }
    return parsed as T;
  }

  /* ====== PUBLIC ENDPOINTS */
  getStatus(): Promise<MonitoringStatus> {
    return this.request<{ response: MonitoringStatus }>(
      "/api/monitoring/status",
    ).then((res) => res.response);
  }

  getTraffic(): Promise<TrafficStats> {
    return this.request<{ response: TrafficStats }>(
      "/api/monitoring/traffic-statistics",
    ).then((res) => res.response);
  }

  getDeviceInfo(): Promise<DeviceInfo> {
    return this.request<{ response: DeviceInfo }>(
      "/api/device/information",
    ).then((res) => res.response);
  }

  async setMobileData(enabled: boolean): Promise<void> {
    await this.request("/api/dialup/mobile-dataswitch", {
      method: "POST",
      bodyObj: {
        dataswitch: enabled ? 1 : 0,
      },
    });
  }

  async reboot(): Promise<void> {
    await this.request("/api/device/control", {
      method: "POST",
      bodyObj: {
        Control: 1,
      },
    });
  }
}
