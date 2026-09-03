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

1. Apply the **token-pool header fix** in `src/api/main.ts` (line ~116): change `__RequestVerificationTokenone` → `__RequestVerificationToken` to get the full pool, not just the first token.
2. **Re-run on device, attempt login**, observe console output. The expected sequence if the XHR swap worked:
   - Pre-login `SesTokInfo` succeeds, `preLoginCookie`/`encodedPassword` log.
   - Login POST returns success.
   - Fresh `Set-Cookie` is logged.
   - Token pool size logs as ~30.
   - First `getStatus()` call succeeds.
3. **If login still fails:** add raw-header logging around the login request (via `xhrRequest`'s `getAllResponseHeaders()`) to see what is actually leaving the device and what comes back. Use that to determine whether `Cookie` is being sent (XHR side working) and whether `Set-Cookie` is being received (platform permitting).
4. **If `Set-Cookie` is not exposed by XHR on this platform:** the login may still work — the device receives and accepts the cookie, but JS can't see it. Test by attempting `getStatus()` regardless; if it works, the issue is purely a JS-side observability limitation and the client is functional.
5. **If `Set-Cookie` is not exposed AND `getStatus()` fails:** escalate to a different transport (custom native module, or form-encoded login if the device supports it).
6. Once login + polling are confirmed working end-to-end: remove diagnostic logs, commit baseline, then move on to Settings screen + `expo-secure-store` + Zustand for settings state.

---

## Change log

- *(template — add entries as work completes: date, what changed, what unblocks what.)*
