# SMS Feature — Research Notes

Target device: Huawei E5576-320, firmware `11.0.1.1(H697SP11C00)`. Sources: `Salamek/huawei-lte-api` (`api/Sms.py`, `enums/sms.py`, `Tools.py`) and `Salamek/huawei-lte-api-ts` (`src/api/Sms.ts`, `src/Connection.ts`). The -ts port mirrors the Python lib method-for-method, so either is citable; Python has the comments.

## Endpoint inventory (`/api/sms/...`, all under the existing authed session)

| Method (Salamek name) | HTTP | Path | Body | Response |
|---|---|---|---|---|
| `smsCount` | GET | `sms/sms-count` | — | counts dict (exact keys unverified on E5576-320 — confirm on device) |
| `getCbsnewslist` | GET | `sms/get-cbsnewslist` | — | carrier broadcasts; skip |
| `splitinfoSms` | GET | `sms/splitinfo-sms` | — | skip |
| `smsFeatureSwitch` | GET | `sms/sms-feature-switch` | — | skip |
| `sendStatus` | GET | `sms/send-status` | — | send-queue status |
| `getSmsList` | **POST** | `sms/sms-list` | PageIndex, ReadCount, BoxType, SortType, Ascending, UnreadPreferred | `{ Count, Messages: { Message: [...] } }` |
| `deleteSms` | POST | `sms/delete-sms` | `{ Index }` | `"OK"` |
| `setRead` | POST | `sms/set-read` | `{ Index }` | `"OK"` |
| `saveSms` (draft) | POST | `sms/save-sms` | Index, Phones{Phone[]}, Sca, Content, Length, Reserved, Date | `"OK"` |
| `sendSms` | POST | `sms/send-sms` | Index, Phones{Phone[]}, Sca, Content, Length, Reserved, Date | `"OK"` |
| `cancelSend` | POST | `sms/cancel-send` | `{ request: 1 }` | `"OK"` |
| `config` / `setConfig` | GET / POST | `sms/config` | SaveMode, Validity, Sca, UseSReport, SendType, Priority | skip v1 |
| `smsCountContact` / `smsListContact` | GET / POST | `sms/sms-count-contact`, `sms/sms-list-contact` | lowercase keys (`pageindex`, `readcount` — casing differs from the rest!) | defer |
| `*-pdu`, `split-sms`, `recover/copy/move-sms` | mixed | various | — | reverse-engineered/untested; defer. Salamek marks `sendSmsPdu` untested |

## Wire details that matter

1. **`sms-list` is POST with a body**, not GET (`postGet` in Salamek = POST on the wire, parsed as a data response). A GET will fail. Our `request<T>(path, { method: "POST", bodyObj })` covers it.
2. **Field order is significant.** Salamek uses `OrderedDict` with the comment "at least the B525s-23a is order sensitive": `PageIndex → ReadCount → BoxType → SortType → Ascending → UnreadPreferred`. `fast-xml-builder` preserves JS insertion order, so build `bodyObj` literally in that order; no spread/merge that could reorder.
3. **Single-message normalization.** One-message inboxes come back as `Messages.Message` = single object (or `Messages` missing). Salamek's `enforce_list_response` coerces dict → `[dict]`. We must do the same or the list crashes on a 1-message inbox.
4. **Date format: `"YYYY-MM-DD HH:MM:SS"`** (naive-local; device clock is its own tz). Parse with a matching format, display via existing `formatRelativeTime` util.
5. **Multipart youth guard.** Salamek skips `MULTIPART` messages < 10s old (comment says 60s, code says 10s — trust the code) so the device can reassemble parts. Filter client-side on `Date`.
6. **Send defaults:** `Index: -1`, `Sca: ''`, `Length: message.length` (JS string length), `Reserved: 1` (SEVEN_BIT), `Date: now` formatted as above.

## Enums (verbatim values, `enums/sms.py`)

- `BoxType`: LOCAL_INBOX=1, LOCAL_SENT=2, LOCAL_DRAFT=3, LOCAL_TRASH=4, SIM_INBOX=5, SIM_SENT=6, SIM_DRAFT=7, MIX_INBOX=8, MIX_SENT=9, MIX_DRAFT=10. Default LOCAL_INBOX=1; MIX_* presence on E5576-320 unverified.
- `Status` (Smstat): NEW=0, READ=1, PENDING=2, SEND=3, SEND_FAILED=4.
- `Type` (SmsType): SINGLE=1, MULTIPART=2, UNICODE=5, DELIVERY_SUCCESS=7, DELIVERY_FAILURE=8.
- `SortType`: DATE=0, PHONE=1, INDEX=2. Default DATE desc (Ascending=0).
- `SaveMode`: LOCAL=0, SIM_CARD=1, SIM_CARD_FIRST=2, LOCAL_FIRST=3. `TextMode` (Reserved): UCS2=0, SEVEN_BIT=1, EIGHT_BIT=2. `SendType`: SEND=0, SEND_AND_SAVE=1.

## Message shape (XML tags → our type)

`Index, Smstat, Phone, Content, Date, Sca, SaveType, Priority, SmsType` — all strings on the wire; coerce numerics at the boundary. Mirrors Salamek's `Message.from_dict`/`to_dict`.

## Auth interaction

None special. `send-sms` etc. go through the same token-error → re-login path (already fixed). No SMS-specific auth work.

## Open on-device questions

1. MIX_* box types present on E5576-320?
2. `sms-count` response keys on this firmware? — **partially answered (2026-09-10):** `LocalUnread`, `LocalInbox`, `LocalOutbox` exist (73/241/2 at time of testing); exact set still unverified.
3. `set-read` returns `"OK"` string or dict?
4. Multipart reassembly timing (10s guard OK?)?
5. **`sms-list` response `Count` semantics — confirmed NOT a reliable box total (2026-09-13).** Salamek's `get_messages()` only ever checks `Count == 0` and pages until an empty page; he never compares Count against fetched totals. Our implementation now does the same (`fetchAllSms` stops on an empty page). Treat Count as informational only.

## Post-research addendum (2026-09-13): fetch-all architecture

The v1 implementation used four `useInfiniteQuery` loops (list inbox/sent, thread inbox/sent) whose `getNextPageParam` heuristics paginated on `Count` — wrong per the above, and it caused out-of-range page errors that cascaded into the UI replacing the whole list with an error. The rework:

- **`fetchAllSms(client, boxType, pageSize=50, maxPages=200)`** in `routes/sms.ts` — Salamek's loop verbatim: page 1..N, stop on empty page (also stop on a partial page), skip `MULTIPART` messages younger than 10s, catch per-page errors and return `{ messages, pages, error }` (error non-fatal).
- **`useAllSms()`** in `src/hooks/useAllSms.ts` — one query (`["sms","all"]`) fetching both boxes via `Promise.all`, merged ascending by device `Date`; 30s refetch interval. The single source of truth for SMS; list and thread both derive from it.
- **Pure selectors** in `components/sms/threads.ts`: `groupThreads`, `filterThreads`, `threadMessages`, `phonesMatch` (last-9-digit normalization — device numbers arrive as `024…`, `+233…`, or `233…`).
- UI does no pagination at all. Dataset is device-storage-capped (241 inbox messages on the test device), so fetch-all is ~5 requests/box — strictly simpler and more correct than incremental paging at this scale.
- **Alphanumeric sender IDs (2026-09-13, second session finding):** many SMS senders are names, not numbers (telecom "MTN", banks, etc.). The original last-9-digit normalizer digit-stripped those to `""`, merging **every named sender into one phantom thread** — this, not pagination, was the dominant cause of "most contacts missing". `normalizePhone` now keys digit-poor senders by their raw name (lowercased); number senders keep last-9 grouping.
- **Sequential box fetches (2026-09-13):** `useAllSms` originally fetched both boxes with `Promise.all`. The device has one auth session and a 2–3 token CSRF pool; two concurrent page loops interleave token rotation and re-login, and a re-login rotates the `SessionID` cookie out from under the other loop → intermittent per-page device errors (the footer flip-flopping between counts and "Device returned error"). Boxes now fetch sequentially.
