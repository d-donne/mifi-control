# Reference: `Salamek/huawei-lte-api` (Python reference implementation)

> Moved out of `PROJECT.md` on 2026-11-03, unchanged. Items 1 (home-page CSRF scrape) and 5 (`refresh_csrf` pool rotation) are implemented in `src/api/main.ts`; the rest remain reference.

`https://github.com/Salamek/huawei-lte-api` — actively maintained, the **E5576-320 is explicitly listed as tested**. E5576-320 is the _exact_ model this project targets. The Python lib isn't usable as a runtime dep (Metro/bundler polyfill fight), but it's the most authoritative reference for protocol details. Pull from it when something is unclear; do **not** install it.

## Why we keep coming back to it

We are reimplementing the protocol from scratch, and the device firmware is the only spec. The Salamek library is the most thoroughly battle-tested open implementation against that spec, including the E5576-320 family. Any time we hit a behavior we don't understand (e.g. why does the device return `text/html` here, why are tokens being rejected, where do new tokens come from mid-session), Salamek's source is the closest thing to a documented explanation.

## Key file map (paths relative to repo root)

- `huawei_lte_api/Session.py` — request/session core. **The most important file for us.** Contains `_initialize_csrf_tokens_and_session`, `_process_response_data`, `_post`, `_get`, and all CSRF-token rotation logic.
- `huawei_lte_api/Connection.py` — thin wrapper that parses user/pass out of the URL and instantiates `UserSession`.
- `huawei_lte_api/api/User.py` — login flow. `_encode_password` is the SHA256 (`password_type: 4`) implementation, byte-for-byte identical to ours; `_login` / `login` show the request body, error-code-to-exception mapping, and the `force_new_login` semantics.
- `huawei_lte_api/api/WebServer.py` — `webserver/SesTokInfo`, `webserver/token`, `webserver/publickey`. Note: `SesTokInfo` is marked `~Valid for: B310s-22` — i.e. it's a _fallback_ for older devices. Modern firmware exposes a different primary CSRF source.
- `huawei_lte_api/enums/client.py` — `ResponseCodeEnum`. Maps error codes to names:
  - `125001` = `ERROR_WRONG_TOKEN` (marked "Unused" in source)
  - `125002` = `ERROR_SYSTEM_CSRF` ("Session error")
  - `125003` = `ERROR_WRONG_SESSION_TOKEN` ("Wrong Session Token")
- `huawei_lte_api/enums/user.py` — `PasswordTypeEnum` and `LoginErrorEnum`:
  - `password_type: 4` = `SHA256` (confirms our hash scheme)
  - `108001` = `USERNAME_WRONG`, `108002` = `PASSWORD_WRONG`, `108006` = `USERNAME_PWD_WRONG`
- `huawei_lte_api/exceptions.py` — the typed exception hierarchy (`ResponseErrorLoginCsrfException`, `ResponseErrorWrongSessionToken`, `LoginErrorUsernamePasswordWrongException`, etc.). Useful as a model for our `HiLinkError` typing.

## Things to learn from this codebase

These are patterns the Salamek lib does that we either don't do, or that confirm assumptions we were unsure about. They are the **highest-priority items** to revisit when something doesn't work as expected.

### 1. **CSRF tokens are parsed from the device's HTML homepage, not from `SesTokInfo`.**

Salamek's `Session._initialize_csrf_tokens_and_session` does this first:

```python
response = self.requests_session.get(self.url, timeout=self.timeout)  # GET http://192.168.8.1/
csrf_tokens = self.csrf_re.findall(response.content.decode("UTF-8"))
# csrf_re = re.compile(r'name="csrf_token"\s+content="(\S+)"')
```

It scrapes `<meta name="csrf_token" content="...">` out of the returned HTML and stores _every_ match (the pool). Only if the HTML doesn't contain that meta tag does it fall back to `/api/webserver/token` and then `/api/webserver/SesTokInfo`.

**This is almost certainly the root cause of our `text/html` mystery and the cascading 125003s.** The device _intends_ for clients to start by fetching the HTML home page; that's where the CSRF pool lives. The `text/html` content type on `SesTokInfo` and `login` responses is probably because the device's "you're an unauthenticated client" code path serves the HTML shell and the `__RequestVerificationToken` we get back is a single un-pooled, un-scoped token not valid for the subsequent authenticated session. After login, the device doesn't re-send a fresh token pool header because _it never expected us to come in through `/api/user/login` without first going through the HTML page_.

**Fix path:** in `triggerLogin()`, GET `http://192.168.8.1/` (or `http://192.168.8.1/html/home.html`) first, parse out every `<meta name="csrf_token" content="...">` from the HTML, and use that as the initial `tokenPool`. Then use the `requests` library's session cookies naturally (the `Set-Cookie: SessionID=...` from the HTML response becomes the auth cookie for the subsequent API calls). Only fall back to `SesTokInfo` if no `csrf_token` meta tags are found in the HTML.

This is a single, focused change and is almost certainly the right next step.

### 2. **The `requests` library's session cookie jar is the auth cookie source.**

Salamek uses `requests.Session` and lets the `Set-Cookie: SessionID=...` from one response be auto-attached to the next. We instead manually build the `SessionID=<sesInfo>` cookie and try to swap it. The Python approach is simpler and more robust: let XHR's cookie store handle it. (RN's `XMLHttpRequest` _does_ persist cookies across requests to the same origin in the same session — we just aren't using it because we're hand-rolling the `Cookie` header.)

**Consider switching** to a "no manual Cookie header" model once the home-page-CSRF-scrape fix is in. Keep the manual approach as fallback.

### 3. **The login request body uses `application/xml` content-type, not `text/xml`.**

Salamek's `_post`:

```python
else:
    headers["Content-Type"] = "application/xml"
```

Our code sends `Content-Type: text/xml; charset=UTF-8` (in both the login POST and the generic `request<T>` method). The device may be picky about this — `application/xml` is the IANA-registered media type for XML; `text/xml` is the legacy subtype. The current behavior is _probably_ tolerated by the device, but if content-type negotiation is ever the issue, switch to `application/xml`.

### 4. **Response data handling: `text/html` is _not_ a fatal error — Salamek sniffs the body.**

`_process_response_data`:

```python
# Others are not conclusive, e.g. text/html may have JSON or XML
# Resort to content sniffing if Content-Type wasn't conclusive
if is_json is None and data and data[0:1] in (b"{", b"["):
    is_json = True
```

It explicitly notes that `text/html` content-type can wrap JSON or XML bodies, and falls back to content sniffing. Our code blindly trusts the parsed-XML shape, which is why a 91-byte HTML page silently passes the `isErrorResponse()` check. If we keep the current parsing approach, at least add an early bail: if the response body doesn't start with `<` or `{`, throw a clear "device returned unexpected content" error.

### 5. **Login uses `refresh_csrf=True` to atomically rotate the token pool.**

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

So the official logic is: **clear the pool, then refill it from `one` + `two` (legacy), falling back to the full `__RequestVerificationToken` header (modern).** This is the _opposite_ of what our session summary and previous diagnosis concluded! Salamek uses `one`/`two` as the primary source and the full header as the fallback. This may be because newer firmware changed the header convention, or because different firmware variants use different ones.

**Implication:** our code reads only `__RequestVerificationToken` (correct for newer firmware), but if E5576-320's specific firmware returns `one`/`two` only, we miss the pool entirely.

**Check:** log the entire response header block on login and see which of `__RequestVerificationToken` / `__RequestVerificationTokenone` / `__RequestVerificationTokentwo` are actually present. The recent logs showed only `__RequestVerificationToken` (single value, not pool), which is consistent with "device served an HTML/redirect page and that header is just the unauthenticated token" — but if the home-page scrape fix works, we'll see the real pool on login. Read all three headers, prefer the full one, fall back to `one`+`two` joined — match Salamek's logic exactly.

### 6. **ConnectionError retry on `state-login`.**

Salamek's `User._state_login_with_retry`:

```python
# Some models reportedly close the connection if we attempt to access login state
# too soon after setting up the session etc. In that case, retry a few times.
# The error is reported to be
# ConnectionError: ('Connection aborted.', RemoteDisconnected('Remote end closed connection without response'))
```

If we ever see the connection drop on the first call to `/api/user/state-login` (or similar) right after session init, this is a known firmware quirk — add a small `(i + 1) / 10`-style backoff and retry up to 5 times. Deferred unless it actually happens.

### 7. **Encryption mode is opt-in, not the default.**

Salamek has full RSA encryption support (`encrypt_transmit` header, `application/x-www-form-urlencoded; charset=UTF-8;enc` content-type, `webserver/publickey` + `user/state-login` `rsapadingtype` lookup) but the default is plain XML. Our implementation has no encryption path yet — that's fine, the device accepts plain XML and that's what the AI Life app uses too. If the firmware ever rejects our login for no clear reason, encryption is the next thing to try.

## When to come back to this section

Any time we hit one of these signals: `text/html` content-type on an `/api/*` call, CSRF/session errors after a successful login, 125003 in particular, or anything where the device's behavior doesn't match the spec we've inferred from curl. Open the Salamek file, find the relevant function, see what they do differently. The answer is almost always there.
