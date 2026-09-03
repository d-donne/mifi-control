/**
 * Generic HiLink API response shapes — types shared across multiple endpoints.
 * Per-endpoint shapes (MonitoringStatus, TrafficStats, DeviceInfo) live in
 * their own files.
 */

/**
 * Response shape for GET /api/webserver/SesTokInfo (pre-login).
 * The pre-login fallback path in `HiLinkClient.trySesTokInfoFallback`
 * parses the response body into this shape.
 */
export interface SessionTokenResponse {
  response: {
    SesInfo: string;
    TokInfo: string;
  };
}

/**
 * Response shape for a HiLink error response.
 * All endpoints wrap errors in `<error><code>...</code><message>...</message></error>`.
 * Codes are typically 6-digit integers (e.g. 108001 = wrong username,
 * 125003 = wrong session token). See `TOKEN_ERROR_CODES` in errors/index.ts
 * for the retryable subset.
 */
export interface DeviceErrorResponse {
  error: {
    code: number | string;
    message?: string;
  };
}
