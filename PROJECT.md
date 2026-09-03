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

### ~~Immediate blocker: login in-app fails with `125003`~~ — RESOLVED

**Resolution:** Rewrote `triggerLogin()` to follow Salamek's `Session._initialize_csrf_tokens_and_session` flow:

1. GET the HTML home page (`http://192.168.8.1/`). Extract every `<meta name="csrf_token" content="...">` value via regex into the CSRF token pool. Read the real `Set-Cookie: SessionID=...` from the response headers.
2. POST `/api/user/login` with the home-page cookie, the first pool token, `Referer: http://192.168.8.1/html/home.html`, and the SHA256-hashed password body.
3. On success, swap the cookie (some firmware variants re-issue `Set-Cookie` post-login, others don't — we now handle both) and atomically rotate the pool from the response headers per Salamek's `refresh_csrf` pattern (prefer `__RequestVerificationTokenone` + `__RequestVerificationTokentwo`, fall back to the full `__RequestVerificationToken`).

The XHR wrapper is also confirmed working — `Set-Cookie` is exposed on Android via `getAllResponseHeaders()`.

**Confirmed working on-device:** the proof-of-concept test screen now displays live `getStatus()` data, polled every 8s, with no 125003 errors. Logs show:

```
post-login cookie: SessionID=d1eCHAWgeUMwcCWE...
login set-cookie header: SessionID=d1eCHAWgeUMwcCWE...; path=/; HttpOnly;
post-login token pool size: 2
```

…and on a subsequent login (user-triggered refresh), the same `SessionID` is reused because the device didn't re-issue it — the fallback to keep the home-page cookie is what made this work.

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

- Real UI/UX, navigation flow, Settings screen (device IP/credentials — currently hardcoded in `.env`).
- SMS reading (`getSmsList` was scoped but not implemented in the current rewritten version).
- USSD.
- Push notifications.
- Zustand store for settings (planned for the Settings screen — genuine multi-reader runtime state).
- `expo-secure-store` for credentials (planned for the Settings screen).
- Resolving the `tryRefillFromSesTokInfo()` unverified behavior (degrades safely; not blocking).
- ~~Confirming whether the XHR swap actually fixes the 125003 login bug~~ — **done, confirmed working.**

### Active work: dashboard

**Next focus.** Auth + credentials flow is in place. Now we build the actual product surface — a real-time(ish) status dashboard showing battery, traffic, network strength, and other signals from the HiLink API.

**Endpoints available (already wired in `HiLinkClient`):**
- `getStatus()` → `/api/monitoring/status` (ConnectionStatus, SignalIcon, CurrentNetworkTypeEx, etc.)
- `getTraffic()` → `/api/monitoring/traffic-statistics` (CurrentDownload/Upload, TotalDownload/Upload)
- `getDeviceInfo()` → `/api/device/information` (DeviceName, SerialNumber, Imei, HardwareVersion, SoftwareVersion)
- `getSmsList()` → **not yet implemented** in `HiLinkClient`. Will need to be added. Endpoint: `/api/sms/sms-list` (per Salamek `api/Sms.py`).

**Phase 1 — Read-only dashboard (in progress).** Cards showing: connection status + signal bars, network type (LTE/3G/etc.), battery percentage, current download/upload rates (KB/s), total download/upload (MB/GB), device info (model, firmware, IMEI), session Uptime.

**Phase 2 — Actions.** Toggle mobile data (`setMobileData`), reboot, SMS list, send SMS, USSD. Out of scope until Phase 1 is shippable.

**Phase 3 — Real-time updates.** Move from polled `useQuery` (current 8s) to either a tighter poll (2-3s) or a periodic background refetch with skeletons during the transition. The Salamek lib doesn't expose any push/socket mechanism, so polling is the only option. *Defer until Phase 1 is in.*

### ~~Active work: credentials and login UI~~ — COMPLETE

All four items in the original "credentials and login UI" plan shipped:
- Credentials moved from `.env` to `expo-secure-store` via `useStoredCredentials` hook.
- Settings screen at `src/app/settings.tsx` — Card + FormControl + Heading primitives (no VStack nesting).
- First-run flow: provider renders `<Settings />` inline when no creds are present.
- Connection-error UX with "Open Wi-Fi settings" + "Edit credentials" buttons.
- Logout button on the test screen (`components/test.tsx`) — calls `clear()` and routes back to root, which renders Settings via the no-creds branch.

**Known loose end (deferred):** the Settings screen's Save button always redirects to the test screen, even if the password was wrong. The user only sees the failure on the test screen's first poll. Needs a real auth flow that surfaces a credential error from `triggerLogin()` back to the Settings screen, and stays on Settings instead of redirecting on auth failure. Deferred until after Phase 1.

---

## Next steps (ordered)

The credentials phase is complete (see "Active work: dashboard" above for status). The next ordered work is the **dashboard phase**, broken into seven steps. Each step is small and shippable on its own; the order is dependency-driven, not "must do all at once."

1. **Decide the layout primitive.** Card grid vs FlatList of rows vs a flex layout. Recommendation: a single-column `VStack` of `<Card>`s, each card = one signal (status, traffic, device, network). Phone screens are narrow; multi-column grids buy little and look cramped.
2. **Add `getSmsList()` to `HiLinkClient`.** Endpoint: `/api/sms/sms-list`. Returns a paginated XML list per Salamek `api/Sms.py`. Skip rendering for now — just the method on the client.
3. **Extract a `useHiLinkQuery` wrapper hook.** Today's `useQuery` call is inlined in `components/test.tsx`. Move it to `src/hooks/useHiLinkQuery.ts` so multiple cards can use the same `useQuery` pattern with consistent error/loading states. Tiny abstraction, big readability win.
4. **Build the `StatusCard` component.** First card in the dashboard. Shows: connection status (text + colored dot), signal strength (bars or % from `SignalIcon`), network type (LTE/3G/5G from `CurrentNetworkTypeEx`). Source: `getStatus()` polled at 8s.
5. **Build the `TrafficCard` component.** Second card. Shows: current download/upload (KB/s, formatted with `Intl.NumberFormat` or a small `formatBytes` util), total download/upload (MB/GB). Source: `getTraffic()` polled at 8s.
6. **Build the `DeviceCard` component.** Third card. Shows: device name, model, firmware version, IMEI (truncated, with a "copy" button), serial number. Source: `getDeviceInfo()`. **Polled less frequently** — every 60s — since it barely changes.
7. **Wire the dashboard to the home screen.** Replace the raw JSON dump in `components/test.tsx` with the three cards. Keep the Logout button. Remove the `<Text>Additional info here</Text>` debug line.

**Deferred (out of Phase 1):**
- Battery percentage (need to verify which endpoint returns it on E5576-320 — likely `/api/monitoring/status` already contains it under a field name we haven't inspected).
- Session uptime (also in monitoring status, need to inspect actual response shape).
- SMS list, send SMS, USSD (Phase 2).
- Real auth error handling (wrong password stays on Settings instead of redirecting — see "Active work" > "Known loose end").
- Status bar theming (dark mode icons not visible against light backgrounds — see earlier session).
- `tryRefillFromSesTokInfo()` unverified behavior (correct but wasteful on token exhaustion).
- Diagnostic `console.log` lines in `triggerLogin()` (keep for now; remove when Phase 1 ships).

---

## Change log

- **2026-09-03 — 125003 login bug resolved.** Rewrote `triggerLogin()` in `src/api/main.ts` to scrape the HTML home page for CSRF tokens + `Set-Cookie` (per Salamek `Session._initialize_csrf_tokens_and_session`). Added `trySesTokInfoFallback()` as a defensive path for older firmware. Added `fetchHomePage()` to wrap the home page request with user-friendly error messages. Token-pool refill on login response now follows Salamek's `refresh_csrf` priority (`one`+`two` first, full header as fallback). Module-level helpers `extractCsrfTokens`, `extractSessionIdCookie`, `extractLoginTokenPool` extracted. Cleaned up `xhr.ts` (exported `XhrResponse`, removed diagnostic `console.log`s) and `errors/index.ts` (dropped dead `ERROR_CODES` export). *Unblocks:* the entire app — `getStatus()` polling now returns live data on-device.
- **2026-09-03 — Post-login cookie fallback added.** First on-device run revealed the E5576-320 firmware does *not* always re-issue `Set-Cookie` on `/api/user/login`. Updated the post-login cookie extraction to keep the home-page `SessionID` when the login response has no new `Set-Cookie`, instead of throwing. Re-added two diagnostic `console.log`s at the post-login decision point (cookie + token pool size). *Unblocks:* stable auth across firmware variants.
- **2026-09-03 — `ScrollView` import fix in `src/app/index.tsx`.** Was importing from `@expo/ui` (which doesn't export `ScrollView`). Switched to `react-native`. Removed dead `useState` for unused `result`/`loading`. Added `flex-1 bg-background` on `SafeAreaView` and `contentContainerClassName="flex-grow"` on `ScrollView` for proper layout. *Unblocks:* UI scrolling on Android.
- **2026-09-03 — Project tracker created.** `AGENTS.md` updated with the "learning project" rules (chat-only by default, no edits without explicit permission). `PROJECT.md` created as the single source of truth. `CLAUDE.md` updated to re-export `PROJECT.md` alongside `AGENTS.md`.
- **2026-09-03 — Salamek reference section added.** Documented seven concrete learnings from the `Salamek/huawei-lte-api` Python source, with code excerpts and implications for our TS implementation. The home-page-CSRF-scrape insight (item 1) was the direct unblocker for the 125003 bug. *Unblocks:* future protocol investigations have a starting point.
- **2026-09-03 — README rewritten.** Replaced the `create-expo-app` boilerplate with a project-specific README covering stack, status, run instructions, and config.
- **2026-09-03 — Credentials phase shipped.** `useStoredCredentials` hook (`src/hooks/useStoredCredentials.ts`) reads/writes three values from `expo-secure-store`. `HiLinkProvider` refactored to consume the hook, drop the `.env` props, and render `<Settings />` inline when no creds are present. Settings screen at `src/app/settings.tsx` built with `Card` + `FormControl` + `Heading` primitives. `_layout.tsx` cleaned up (removed unused `useUniwind` import). Test screen got a Logout button that calls `clear()` and routes to root, which renders Settings via the no-creds branch. *Unblocks:* Phase 1 dashboard can now ship behind a real auth gate.
- **2026-09-03 — Dashboard phase started.** Plan added to "Next steps" and "Active work" sections. Will build a single-column `VStack` of `Card`s showing status, traffic, and device info. Implementation steps 1-7 enumerated. SMS list method on the client is the first concrete addition; the other steps are component work.
