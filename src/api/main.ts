import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { REFERER } from "./constants";
import { HiLinkError, isErrorResponse, TOKEN_ERROR_CODES } from "./errors";
import {
  DeviceErrorResponse,
  DeviceInfo,
  MonitoringStatus,
  SessionTokenResponse,
  TrafficStats,
} from "./types";
import { encodePassword } from "./utils/crypto";
import { xhrRequest } from "./utils/xhr";

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
   * builds the pre-login cookie then swaps real Set-Cookie the device issues on success,
   * then loads the token pool
   */
  private async triggerLogin(): Promise<void> {
    const sesRes = await xhrRequest(`${this.baseUrl}/api/webserver/SesTokInfo`);
    if (!sesRes.ok) {
      throw new HiLinkError(
        `Failed to trigger login: HTTP ${sesRes.status}`,
        sesRes.status,
      );
    }

    const sesData = this.parser.parse(
      await sesRes.text(),
    ) as SessionTokenResponse;
    const sesInfo: string | undefined = sesData?.response?.SesInfo;
    const initialToken: string | undefined = sesData?.response?.TokInfo;
    if (!sesInfo || !initialToken) {
      throw new HiLinkError(
        "Malformed session response: is this a HiLink device?",
      );
    }

    // device expects SessionID as cookie name
    const preLoginCookie = `SessionID=${sesInfo}`;
    const encodedPassword = await encodePassword(
      this.username,
      this.password,
      initialToken,
    );

    console.log("sesInfo:", sesInfo);
    console.log("initialToken:", initialToken);
    console.log("preLoginCookie:", preLoginCookie);
    console.log("encodedPassword:", encodedPassword);

    const loginRes = await xhrRequest(`${this.baseUrl}/api/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        Cookie: preLoginCookie,
        __RequestVerificationToken: initialToken,
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

    console.log("login status:", loginRes.status);

    const loginBody = this.parser.parse(await loginRes.text());
    if (isErrorResponse(loginBody)) {
      throw new HiLinkError(
        `Login failed: ${loginBody.error.message}`,
        loginBody.error.code,
      );
    }


    // on success, the device sends a real Set-Cookie to be used for subsequent requests
    const setCookie = loginRes.headers.get("set-cookie");
    if (!setCookie)
      throw new HiLinkError("Login succeeded but no token poll was returned");
    this.cookie = setCookie.split(";")[0];

    // token comes back as # delimited pool of one-time use tokens
    const tokenHeader = loginRes.headers.get("__RequestVerificationTokenone");
    this.tokenPool = tokenHeader ? tokenHeader.split("#").filter(Boolean) : [];
    if (this.tokenPool.length === 0)
      throw new HiLinkError("Login succeeded but no token poll was returned");
  }

  // ======= TOKEN MANAGEMENT =======

  /**
   * Returns the next available token from the pool, or null if the pool is empty.
   */
  private nextToken(): string | null {
    return this.tokenPool.shift() ?? null;
  }

  /**
   * TEST: may not work
   * rehit the SesTokInfo endpoint to get a new token pool without a full
   * re-login. keep the already authenticated cookie untouched
   */
  private async tryRefillFromSesTokInfo(): Promise<Boolean> {
    try {
      const res = await xhrRequest(`${this.baseUrl}/api/webserver/SesTokInfo`);
      if (!res.ok) return false;
      const data = this.parser.parse(await res.text()) as SessionTokenResponse;
      if (data.response?.TokInfo) {
        this.tokenPool = [data.response.TokInfo];
        return true;
      }
    } catch (error) {
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
      throw new HiLinkError("No valid session after login/refres attempts");

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
