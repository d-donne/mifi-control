# Auth & Session — Research Notes

Target device: Huawei E5576-320. Sources: `Salamek/huawei-lte-api` (`Session.py`, `api/User.py`) vs our `src/api/main.ts` + `src/hooks/HiLinkProvider.tsx` + `src/hooks/useStoredCredentials.ts`.

## Salamek findings (verified from raw source)

1. **Token init** — `Session._initialize_csrf_tokens_and_session`: GET `/`, scrape `name="csrf_token" content="..."` via `csrf_re`, grab `SessionID` cookie. Same as our home-page scrape.
2. **POST consumes, then reuses last token:**

```python
if len(self.request_verification_tokens) > 1:
    headers["__RequestVerificationToken"] = self.request_verification_tokens.pop(0)
else:
    headers["__RequestVerificationToken"] = self.request_verification_tokens[0]
```

Pool of 2 → consume down to 1, then reuse that last token forever. Our `nextToken()` does `shift()` unconditionally — drains to zero, then forces a full re-login. 3. **GET sends a token header only when exactly 1 token remains:**

```python
if len(self.request_verification_tokens) == 1:
    headers["__RequestVerificationToken"] = self.request_verification_tokens[0]
```

Our `request()` sends a token on every GET and burns one each time. 4. **Pool refills from every POST response** (`__RequestVerificationTokenone` + `two`, else `__RequestVerificationToken`). Our `request()` never reads response token headers — pool only depletes. 5. **Retry is single-shot:** `_try_or_reload_and_retry` catches only `ResponseErrorLoginCsrfException` → `reload()` once → retry once. No attempt counter, no loop. 6. **state-login gate:** `User.login()` calls `user/state-login` first; `State == LOGGED_IN and not force_new_login` → return True, skip login entirely. `UserSession` passes `force_new_login=True` only for fresh sessions. Our `connect()` always full-logins. 7. **Logout:** `POST user/logout { Logout: 1 }` on session close. We never call it. 8. **Login errors are typed:** 108001/108002/108006 wrong creds, 108007 overrun/lockout, 108003 already-logged-in (proceed). We surface raw messages only.

## Our gaps (slices A–E)

- **A. Transport:** drain-on-every-request + no response-header refill → login storm under polling.
- **B. state-login gate + typed login errors:** no warm-session skip; lockout indistinguishable from wrong password.
- **C. Single-flight login + retry cap:** concurrent `request()` calls can each trigger `triggerLogin()`; `attempt > 2` full logins per failure.
- **D. Credential state fan-out:** `useStoredCredentials()` is per-hook-instance `useState`; Settings `save()` never reaches the provider effect. Genuine multi-reader runtime state.
- **E. Warm reconnect:** no foreground re-validation (AI Life behavior).

## Plan

A → D → B → C → E. A+D fix both reported symptoms; B+C harden; E is polish.

## Status (2026-11-03)

- **A. Transport — done.** `pickToken()` follows Salamek (GETs attach a token only when one remains; POSTs consume down to one, then reuse it); POST responses refill the pool.
- **B. state-login gate + typed login errors — done.** `ensureLoggedIn()` skips login when `State` is `0`. Errors map to `credentials` / `blocked` / `network` / `other` in `useSession`, each with its own message on the sign-in screen. Added `115002` (password change required).
- **C. Single-flight + retry cap — done.** `loginOnce()` shares one login; a token error retries the request once.
- **D. Credential fan-out — done.** Zustand `useSession` replaced `useStoredCredentials`. Credentials are saved only after the device accepts them.
- **E. Warm reconnect on foreground — open.**

Added beyond the plan:

- **Rejection latch:** after `108001/2/6`, `108007` or `115002` the client never logs in again and fires `onLoginRejected`, so polling can't burn lockout attempts. The session returns to the sign-in screen with the error.
- **One device session:** a replaced client is `close()`d first so it can't re-login with stale credentials. Sign-out calls `user/logout` best-effort (never logs in just to log out).
- **Protected routes:** `sign-in` vs `(app)` guarded on `status === "connected"`; splash held during the startup reconnect (max 4 s).
- **Reachability probe:** unauthenticated `user/state-login` (4 s timeout) shows whether the MiFi is reachable before any login attempt; auto-retry when it becomes reachable, **only with known-good credentials**.
- **`Referer`** comes from the stored base URL (`/html/home.html`), not `.env`. `.env` is no longer read.

Open: lockout countdown (the response field holding remaining attempts / wait time is unknown); `console.log`s in `triggerLogin()` print the `SessionID` and should go.
