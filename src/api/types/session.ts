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
