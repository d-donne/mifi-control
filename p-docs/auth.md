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
Pool of 2 → consume down to 1, then reuse that last token forever. Our `nextToken()` does `shift()` unconditionally — drains to zero, then forces a full re-login.
3. **GET sends a token header only when exactly 1 token remains:**
```python
if len(self.request_verification_tokens) == 1:
    headers["__RequestVerificationToken"] = self.request_verification_tokens[0]
```
Our `request()` sends a token on every GET and burns one each time.
4. **Pool refills from every POST response** (`__RequestVerificationTokenone` + `two`, else `__RequestVerificationToken`). Our `request()` never reads response token headers — pool only depletes.
5. **Retry is single-shot:** `_try_or_reload_and_retry` catches only `ResponseErrorLoginCsrfException` → `reload()` once → retry once. No attempt counter, no loop.
6. **state-login gate:** `User.login()` calls `user/state-login` first; `State == LOGGED_IN and not force_new_login` → return True, skip login entirely. `UserSession` passes `force_new_login=True` only for fresh sessions. Our `connect()` always full-logins.
7. **Logout:** `POST user/logout { Logout: 1 }` on session close. We never call it.
8. **Login errors are typed:** 108001/108002/108006 wrong creds, 108007 overrun/lockout, 108003 already-logged-in (proceed). We surface raw messages only.

## Our gaps (slices A–E)

- **A. Transport:** drain-on-every-request + no response-header refill → login storm under polling.
- **B. state-login gate + typed login errors:** no warm-session skip; lockout indistinguishable from wrong password.
- **C. Single-flight login + retry cap:** concurrent `request()` calls can each trigger `triggerLogin()`; `attempt > 2` full logins per failure.
- **D. Credential state fan-out:** `useStoredCredentials()` is per-hook-instance `useState`; Settings `save()` never reaches the provider effect. Genuine multi-reader runtime state.
- **E. Warm reconnect:** no foreground re-validation (AI Life behavior).

## Plan

A → D → B → C → E. A+D fix both reported symptoms; B+C harden; E is polish.
See `PROJECT.md` Active work for status.
