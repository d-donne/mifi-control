# MiFi Dashboard — Project Tracker

A custom Expo (React Native + TypeScript) app to control a Huawei E5576-320 MiFi directly via its local HiLink HTTP API — replacing the official "AI Life" app. No backend server; the phone talks straight to the device at `192.168.8.1` over local Wi-Fi.

This file is the single source of truth for project state. Update as work progresses.

---

## Stack & conventions

- **Expo + TypeScript** (SDK 57, React 19.2, RN 0.86, per `package.json`).
- **Bun** is the package manager / runtime (`bun.lock` present). Use `bunx` instead of `npx`; `bun install` instead of `npm install`.
- **No backend.** HiLink API is plain HTTP+XML served by the device; phone calls it directly.
- **Not using `huawei-lte-api-ts` / `huawei-lte-api` (Python) as runtime deps.** Both are reference sources for endpoint names/auth flow, but the protocol is simple enough to reimplement directly (and worth avoiding the Node polyfill fight).
- **`fast-xml-parser`** for XML parsing (`XMLParser`) — pure JS, works in Expo Go.
- **`fast-xml-builder`** for XML building — installed directly (CVE-2026-41650 was fixed there; `fast-xml-parser`'s own `XMLBuilder` is a thin re-export).
- **`expo-crypto`** for SHA256. **No `Buffer` polyfill** — Hermes/RN ≥0.74 has native `btoa`/`atob`, so `btoa(hexString)` works directly.
- **`@tanstack/react-query`** for all data fetching/polling/mutations — chosen to avoid `useEffect`-based manual state. The only `useEffect` in the app is the one-time async client connection in the provider.
- **Context, not Zustand,** for sharing the single connected `HiLinkClient` instance — this is dependency injection (one object, created once), not state management. **Zustand is earmarked for the Settings screen** once it exists (genuine multi-reader runtime state).
- **Class-based `HiLinkClient`** (owner's explicit preference over a closure-based factory).
- **Gluestack UI + Uniwind** for styling — *Gluestack's Uniwind adapter specifically, not NativeWind*. Primitives under `components/ui/*` (`Box`, `Center`, `VStack`, `Text`, etc.).
- **Expo Router** (file-based routing: `src/app/_layout.tsx`, `src/app/index.tsx`). Root providers live in `_layout.tsx`, wrapping a `<Stack />` (NOT `<Slot />` — gives real navigation/headers; multiple screens are planned).

### Latest verified versions (as of project setup)

Pinned in `package.json` to the current latest releases:

- `@gluestack-ui/core` `5.0.15`, `@gluestack-ui/utils` `5.0.6`
- `uniwind` `1.11.0`
- `fast-xml-parser` `5.11.1`, `fast-xml-builder` `1.3.1`
- `@tanstack/react-query` `5.102.8`
- `expo-crypto` `57.0.2`

When upgrading, recheck the npm registry — these are the latest at the time of writing, not a guarantee.

---

## Device facts (Huawei E5576-320)

Confirmed via direct curl testing in-session:

- Firmware `11.0.1.1(H697SP11C00)`, WebUI `11.0.1.1(W11SP6C03)`.
- `GET /api/webserver/SesTokInfo` returns `<response><SesInfo>...</SesInfo><TokInfo>...</TokInfo></response>` with **no `Set-Cookie` header** — body-only session, pre-login.
- **Cookie name bug:** the device expects cookie name `SessionID`, NOT `SesInfo`. `<SesInfo>` is just the XML tag name; the value must be sent as `Cookie: SessionID=<value>`. `SesInfo=` causes every authenticated call to fail.
- **Login is mandatory** before any protected endpoint. Confirmed via `GET /api/user/state-login` returning `State: -1` and `password_type: 4` pre-login.
- **`Referer: http://192.168.8.1/html/home.html` header is required** on the login POST (and likely other authenticated calls).
- **Password hashing** (`password_type: 4`), confirmed against 3 independent sources (Python `huawei-lte-api`, the device's frontend JS, a Rust reimplementation):
  ```
  innerHash    = base64( hex( sha256(password) ) )
  finalPassword = base64( hex( sha256(username + innerHash + token) ) )
  ```
  base64-encodes the **hex string as ASCII text**, not the raw digest bytes.
- **On successful login**, the device:
  - Sends a real `Set-Cookie: SessionID=...` header with a **different value** than the pre-login manually-built cookie. Client must switch to this new cookie for all subsequent requests.
  - Returns a **pool of ~30 one-time-use tokens** in the `__RequestVerificationToken` header, `#`-delimited. The first two are also duplicated individually as `__RequestVerificationTokenone` / `__RequestVerificationTokentwo` (legacy). **Read the full pool from `__RequestVerificationToken`, not from `one`/`two`** (those only contain a single token each).
  - Each authenticated request should consume the **next** token from the pool, not reuse one repeatedly.
- **Error codes (live-tested):**
  - `125002` = wrong/missing session or CSRF token.
  - `125003` = "WRONG SESSION TOKEN" specifically.
  - `108001` = wrong username (login failure — NOT a token issue, must not be retried).
  - `108006` = `LOGIN_USERNAME_OR_PASSWORD_ERROR` (also not retryable).
  - Only `125001`/`125002`/`125003` should trigger token-refresh-and-retry.

---

## Current file layout

```
.env                          # EXPO_PUBLIC_MODEM_URL / _USERNAME / _PASS
src/
  api/
    constants/index.ts        # BASEURL, USERNAME, PASS from env; REFERER constant
    errors/index.ts           # HiLinkError class, isErrorResponse(), TOKEN_ERROR_CODES
    types/index.ts            # SessionTokenResponse, DeviceErrorResponse, MonitoringStatus, TrafficStats, DeviceInfo
    main.ts                   # HiLinkClient class — core client (login + request methods + public endpoints)
    utils/crypto.ts           # encodePassword() — Huawei password_type:4 hash scheme
    utils/xhr.ts              # Thin fetch-shaped wrapper around XMLHttpRequest (Cookie-header workaround)
  hooks/HiLinkProvider.tsx    # Context provider; connects client once, exposes useHiLinkClient()
  app/_layout.tsx             # Root: QueryClientProvider > HiLinkProvider > GluestackUIProvider > Stack
  app/index.tsx               # Renders <Test /> inside gluestack Box/Center/VStack
components/test.tsx           # Minimal proof-of-concept screen; useQuery(['status'], client.getStatus, refetchInterval: 8000)
```

---

## Open work / blockers

### Immediate blocker: login in-app fails with `125003`

**Symptom:** Despite all logged intermediate values (`sesInfo`, `initialToken`, `preLoginCookie`, `encodedPassword`) matching values that succeeded via manual curl, the in-app login fails with `Login failed:  (125003)`.

**Root cause (suspected, unconfirmed):** React Native's `fetch()` silently drops the `Cookie` header — it's on the Fetch spec's forbidden-header-names list, and `fetch()` enforces that. Confirmed against react-native#13452. The device never receives the session cookie, so the login session is not properly established.

**Fix attempted (not yet on-device tested):** Replace `fetch()` with `XMLHttpRequest` via `src/api/utils/xhr.ts`. RN's XHR `setRequestHeader()` does **not** enforce the forbidden-header restriction. The `xhrRequest` wrapper is written and imported into `main.ts`; all four call sites (`SesTokInfo` GET, login POST, `tryRefillFromSesTokInfo` GET, generic `request<T>`) use it. Login has not yet been re-tested on-device with this swap.

**Open question (deferred from last session):** whether `getAllResponseHeaders()` via XHR actually exposes `Set-Cookie` on the target platform. Some platforms restrict reading that response header even outside `fetch`'s forbidden-name restrictions. Needs to be checked the first time login is retried.

**Secondary bug found during review (not yet fixed in source):** `triggerLogin()` was reading `__RequestVerificationTokenone` for the token pool. That header only contains the **first** token, not the full `#`-delimited pool. The full pool is in `__RequestVerificationToken`. Reading `one` leaves the pool with 1 element, which forces a refill (unverified) → relogin on every other authenticated request and likely contributes to cascading 125003s independent of the Cookie bug. **Fix: change the header read to `__RequestVerificationToken`.**

### Known-unverified risk (deferred, not urgent)

`tryRefillFromSesTokInfo()` — the fallback that re-hits `SesTokInfo` mid-session to get one fresh token without a full re-login — is **unverified**. Unknown whether `SesTokInfo` called *after* already being logged in returns a token valid for the existing authenticated cookie, or silently starts an unrelated anonymous pre-login session. Current design falls back to a full `triggerLogin()` if the refill's token doesn't work, so it degrades safely for now (just inefficiently).

---

## Reference: `Salamek/huawei-lte-api` (Python reference implementation)

`https://github.com/Salamek/huawei-lte-api` — actively maintained, the **E5576-320 is explicitly listed as tested**. E5576-320 is the *exact* model this project targets. The Python lib isn't usable as a runtime dep (Metro/bundler polyfill fight), but it's the most authoritative reference for protocol details. Pull from it when something is unclear; do **not** install it.

### Why we keep coming back to it

We are reimplementing the protocol from scratch, and the device firmware is the only spec. The Salamek library is the most thoroughly battle-tested open implementation against that spec, including the E5576-320 family. Any time we hit a behavior we don't understand (e.g. why does the device return `text/html` here, why are tokens being rejected, where do new tokens come from mid-session), Salamek's source is the closest thing to a documented explanation.

### Key file map (paths relative to repo root)

- `huawei_lte_api/Session.py` — request/session core. **The most important file for us.** Contains `_initialize_csrf_tokens_and_session`, `_process_response_data`, `_post`, `_get`, and all CSRF-token rotation logic.
- `huawei_lte_api/Connection.py` — thin wrapper that parses user/pass out of the URL and instantiates `UserSession`.
- `huawei_lte_api/api/User.py` — login flow. `_encode_password` is the SHA256 (`password_type: 4`) implementation, byte-for-byte identical to ours; `_login` / `login` show the request body, error-code-to-exception mapping, and the `force_new_login` semantics.
- `huawei_lte_api/api/WebServer.py` — `webserver/SesTokInfo`, `webserver/token`, `webserver/publickey`. Note: `SesTokInfo` is marked `~Valid for: B310s-22` — i.e. it's a *fallback* for older devices. Modern firmware exposes a different primary CSRF source.
- `huawei_lte_api/enums/client.py` — `ResponseCodeEnum`. Maps error codes to names:
  - `125001` = `ERROR_WRONG_TOKEN` (marked "Unused" in source)
  - `125002` = `ERROR_SYSTEM_CSRF` ("Session error")
  - `125003` = `ERROR_WRONG_SESSION_TOKEN` ("Wrong Session Token")
- `huawei_lte_api/enums/user.py` — `PasswordTypeEnum` and `LoginErrorEnum`:
  - `password_type: 4` = `SHA256` (confirms our hash scheme)
  - `108001` = `USERNAME_WRONG`, `108002` = `PASSWORD_WRONG`, `108006` = `USERNAME_PWD_WRONG`
- `huawei_lte_api/exceptions.py` — the typed exception hierarchy (`ResponseErrorLoginCsrfException`, `ResponseErrorWrongSessionToken`, `LoginErrorUsernamePasswordWrongException`, etc.). Useful as a model for our `HiLinkError` typing.

### Things to learn from this codebase

These are patterns the Salamek lib does that we either don't do, or that confirm assumptions we were unsure about. They are the **highest-priority items** to revisit when something doesn't work as expected.

#### 1. **CSRF tokens are parsed from the device's HTML homepage, not from `SesTokInfo`.**

Salamek's `Session._initialize_csrf_tokens_and_session` does this first:
```python
response = self.requests_session.get(self.url, timeout=self.timeout)  # GET http://192.168.8.1/
csrf_tokens = self.csrf_re.findall(response.content.decode("UTF-8"))
# csrf_re = re.compile(r'name="csrf_token"\s+content="(\S+)"')
```
It scrapes `<meta name="csrf_token" content="...">` out of the returned HTML and stores *every* match (the pool). Only if the HTML doesn't contain that meta tag does it fall back to `/api/webserver/token` and then `/api/webserver/SesTokInfo`.

**This is almost certainly the root cause of our `text/html` mystery and the cascading 125003s.** The device *intends* for clients to start by fetching the HTML home page; that's where the CSRF pool lives. The `text/html` content type on `SesTokInfo` and `login` responses is probably because the device's "you're an unauthenticated client" code path serves the HTML shell and the `__RequestVerificationToken` we get back is a single un-pooled, un-scoped token not valid for the subsequent authenticated session. After login, the device doesn't re-send a fresh token pool header because *it never expected us to come in through `/api/user/login` without first going through the HTML page*.

**Fix path:** in `triggerLogin()`, GET `http://192.168.8.1/` (or `http://192.168.8.1/html/home.html`) first, parse out every `<meta name="csrf_token" content="...">` from the HTML, and use that as the initial `tokenPool`. Then use the `requests` library's session cookies naturally (the `Set-Cookie: SessionID=...` from the HTML response becomes the auth cookie for the subsequent API calls). Only fall back to `SesTokInfo` if no `csrf_token` meta tags are found in the HTML.

This is a single, focused change and is almost certainly the right next step.

#### 2. **The `requests` library's session cookie jar is the auth cookie source.**

Salamek uses `requests.Session` and lets the `Set-Cookie: SessionID=...` from one response be auto-attached to the next. We instead manually build the `SessionID=<sesInfo>` cookie and try to swap it. The Python approach is simpler and more robust: let XHR's cookie store handle it. (RN's `XMLHttpRequest` *does* persist cookies across requests to the same origin in the same session — we just aren't using it because we're hand-rolling the `Cookie` header.)

**Consider switching** to a "no manual Cookie header" model once the home-page-CSRF-scrape fix is in. Keep the manual approach as fallback.

#### 3. **The login request body uses `application/xml` content-type, not `text/xml`.**

Salamek's `_post`:
```python
else:
    headers["Content-Type"] = "application/xml"
```
Our code sends `Content-Type: text/xml; charset=UTF-8` (in both the login POST and the generic `request<T>` method). The device may be picky about this — `application/xml` is the IANA-registered media type for XML; `text/xml` is the legacy subtype. The current behavior is *probably* tolerated by the device, but if content-type negotiation is ever the issue, switch to `application/xml`.

#### 4. **Response data handling: `text/html` is *not* a fatal error — Salamek sniffs the body.**

`_process_response_data`:
```python
# Others are not conclusive, e.g. text/html may have JSON or XML
# Resort to content sniffing if Content-Type wasn't conclusive
if is_json is None and data and data[0:1] in (b"{", b"["):
    is_json = True
```
It explicitly notes that `text/html` content-type can wrap JSON or XML bodies, and falls back to content sniffing. Our code blindly trusts the parsed-XML shape, which is why a 91-byte HTML page silently passes the `isErrorResponse()` check. If we keep the current parsing approach, at least add an early bail: if the response body doesn't start with `<` or `{`, throw a clear "device returned unexpected content" error.

#### 5. **Login uses `refresh_csrf=True` to atomically rotate the token pool.**

Salamek's `_login` calls `self._session.post_set("user/login", ..., refresh_csrf=True)`, and inside `_post`:
```python
if refresh_csrf:
    self.request_verification_tokens = []
if "__RequestVerificationTokenone" in response.headers:
    self.request_verification_tokens.append(response.headers["__RequestVerificationTokenone"])
    if "__RequestVerificationTokentwo" in response.headers:
        self.request_verification_tokens.append(response.headers["__RequestVerificationTokentwo"])
elif "__RequestVerificationToken" in response.headers:
    self.request_verification_tokens.append(response.headers["__RequestVerificationToken"])
```
So the official logic is: **clear the pool, then refill it from `one` + `two` (legacy), falling back to the full `__RequestVerificationToken` header (modern).** This is the *opposite* of what our session summary and previous diagnosis concluded! Salamek uses `one`/`two` as the primary source and the full header as the fallback. This may be because newer firmware changed the header convention, or because different firmware variants use different ones.

**Implication:** our code reads only `__RequestVerificationToken` (correct for newer firmware), but if E5576-320's specific firmware returns `one`/`two` only, we miss the pool entirely.

**Check:** log the entire response header block on login and see which of `__RequestVerificationToken` / `__RequestVerificationTokenone` / `__RequestVerificationTokentwo` are actually present. The recent logs showed only `__RequestVerificationToken` (single value, not pool), which is consistent with "device served an HTML/redirect page and that header is just the unauthenticated token" — but if the home-page scrape fix works, we'll see the real pool on login. Read all three headers, prefer the full one, fall back to `one`+`two` joined — match Salamek's logic exactly.

#### 6. **ConnectionError retry on `state-login`.**

Salamek's `User._state_login_with_retry`:
```python
# Some models reportedly close the connection if we attempt to access login state
# too soon after setting up the session etc. In that case, retry a few times.
# The error is reported to be
# ConnectionError: ('Connection aborted.', RemoteDisconnected('Remote end closed connection without response'))
```
If we ever see the connection drop on the first call to `/api/user/state-login` (or similar) right after session init, this is a known firmware quirk — add a small `(i + 1) / 10`-style backoff and retry up to 5 times. Deferred unless it actually happens.

#### 7. **Encryption mode is opt-in, not the default.**

Salamek has full RSA encryption support (`encrypt_transmit` header, `application/x-www-form-urlencoded; charset=UTF-8;enc` content-type, `webserver/publickey` + `user/state-login` `rsapadingtype` lookup) but the default is plain XML. Our implementation has no encryption path yet — that's fine, the device accepts plain XML and that's what the AI Life app uses too. If the firmware ever rejects our login for no clear reason, encryption is the next thing to try.

### When to come back to this section

Any time we hit one of these signals: `text/html` content-type on an `/api/*` call, CSRF/session errors after a successful login, 125003 in particular, or anything where the device's behavior doesn't match the spec we've inferred from curl. Open the Salamek file, find the relevant function, see what they do differently. The answer is almost always there.

### Deferred features

- Real UI/UX, navigation flow, Settings screen (device IP/credentials — currently hardcoded).
- SMS reading (`getSmsList` was scoped but not implemented in the current rewritten version).
- USSD.
- Push notifications.
- Zustand store for settings (deferred until Settings screen exists).
- `expo-secure-store` for credentials (deferred until client fully works).
- Resolving the `tryRefillFromSesTokInfo()` unverified behavior.
- Confirming whether the XHR swap actually fixes the 125003 login bug (immediate next step).

---

## Next steps (ordered)

1. **Rewrite `triggerLogin()` to scrape the HTML homepage first** (per Salamek `Session._initialize_csrf_tokens_and_session`). Specifically:
   - GET `http://192.168.8.1/` (or `/html/home.html`).
   - Parse out *every* `<meta name="csrf_token" content="...">` value. That pool becomes the initial `tokenPool`.
   - The `Set-Cookie: SessionID=...` from that HTML response (if present) becomes the auth cookie. If not, fall back to scraping a session ID from the HTML or to `SesTokInfo` as a secondary source.
   - Only fall back to `/api/webserver/SesTokInfo` if the HTML scrape yielded zero CSRF tokens.
   - After this works, drop the `SesTokInfo` call from the happy path entirely.
2. **Update token-pool refill logic to match Salamek's `refresh_csrf` behavior** in `_post`: clear the pool, then refill from `__RequestVerificationTokenone` + `__RequestVerificationTokentwo` (legacy primary), falling back to the full `__RequestVerificationToken` header (modern fallback). Currently we read only the full header, which is the opposite priority.
3. **Add a content-type sniff / bail** in the XHR wrapper or the response parser: if the body doesn't start with `<` or `{`, throw a clear "device returned unexpected content" error instead of silently parsing garbage as XML.
4. **Re-test on device.** Expected: home page returns HTML with multiple `csrf_token` meta tags; login succeeds against `/api/user/login` with a `Set-Cookie` and a real `#`-delimited token pool; `getStatus()` polling returns real data.
5. If still 125003: log the full raw header block on the login response to see whether `__RequestVerificationToken` / `__RequestVerificationTokenone` / `__RequestVerificationTokentwo` are present and what their values are. Per the current logs we only see one of them, which is consistent with the device being in an unauth state and serving HTML.
6. If still 125003 after the above: switch login body Content-Type to `application/xml` (item 3 in the Salamek reference), then consider whether to drop manual Cookie management in favor of letting XHR's cookie store handle it (item 2 in the Salamek reference).
7. Once login + polling are confirmed working end-to-end: remove diagnostic logs, commit baseline, then move on to Settings screen + `expo-secure-store` + Zustand for settings state.

---

## Change log

- *(template — add entries as work completes: date, what changed, what unblocks what.)*
