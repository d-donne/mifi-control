# SMS Feature — Research Notes

Target device: Huawei E5576-320, firmware `11.0.1.1(H697SP11C00)`. Sources: `Salamek/huawei-lte-api` (`api/Sms.py`, `enums/sms.py`, `Tools.py`) and `Salamek/huawei-lte-api-ts` (`src/api/Sms.ts`, `src/Connection.ts`). The -ts port mirrors the Python lib method-for-method, so either is citable; Python has the comments.

## Endpoint inventory (`/api/sms/...`, all under the existing authed session)

| Method (Salamek name)                         | HTTP       | Path                                            | Body                                                                      | Response                                                                |
| --------------------------------------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `smsCount`                                    | GET        | `sms/sms-count`                                 | —                                                                         | counts dict (exact keys unverified on E5576-320 — confirm on device)    |
| `getCbsnewslist`                              | GET        | `sms/get-cbsnewslist`                           | —                                                                         | carrier broadcasts; skip                                                |
| `splitinfoSms`                                | GET        | `sms/splitinfo-sms`                             | —                                                                         | skip                                                                    |
| `smsFeatureSwitch`                            | GET        | `sms/sms-feature-switch`                        | —                                                                         | skip                                                                    |
| `sendStatus`                                  | GET        | `sms/send-status`                               | —                                                                         | send-queue status                                                       |
| `getSmsList`                                  | **POST**   | `sms/sms-list`                                  | PageIndex, ReadCount, BoxType, SortType, Ascending, UnreadPreferred       | `{ Count, Messages: { Message: [...] } }`                               |
| `deleteSms`                                   | POST       | `sms/delete-sms`                                | `{ Index }`                                                               | `"OK"`                                                                  |
| `setRead`                                     | POST       | `sms/set-read`                                  | `{ Index }`                                                               | `"OK"`                                                                  |
| `saveSms` (draft)                             | POST       | `sms/save-sms`                                  | Index, Phones{Phone[]}, Sca, Content, Length, Reserved, Date              | `"OK"`                                                                  |
| `sendSms`                                     | POST       | `sms/send-sms`                                  | Index, Phones{Phone[]}, Sca, Content, Length, Reserved, Date              | `"OK"`                                                                  |
| `cancelSend`                                  | POST       | `sms/cancel-send`                               | `{ request: 1 }`                                                          | `"OK"`                                                                  |
| `config` / `setConfig`                        | GET / POST | `sms/config`                                    | SaveMode, Validity, Sca, UseSReport, SendType, Priority                   | skip v1                                                                 |
| `smsCountContact` / `smsListContact`          | GET / POST | `sms/sms-count-contact`, `sms/sms-list-contact` | lowercase keys (`pageindex`, `readcount` — casing differs from the rest!) | defer                                                                   |
| `*-pdu`, `split-sms`, `recover/copy/move-sms` | mixed      | various                                         | —                                                                         | reverse-engineered/untested; defer. Salamek marks `sendSmsPdu` untested |

## Wire details that matter

1. **`sms-list` is POST with a body**, not GET (`postGet` in Salamek = POST on the wire, parsed as a data response). A GET will fail. Our `request<T>(path, { method: "POST", bodyObj })` covers it.
2. **Field order is significant.** Salamek uses `OrderedDict` with the comment "at least the B525s-23a is order sensitive": `PageIndex → ReadCount → BoxType → SortType → Ascending → UnreadPreferred`. `fast-xml-builder` preserves JS insertion order, so build `bodyObj` literally in that order; no spread/merge that could reorder.
3. **Single-message normalization.** One-message inboxes come back as `Messages.Message` = single object (or `Messages` missing). Salamek's `enforce_list_response` coerces dict → `[dict]`. We must do the same or the list crashes on a 1-message inbox.
4. **Date format: `"YYYY-MM-DD HH:MM:SS"`, no zone.** Received messages are UTC+5:30 wall-clock time on this device; sent ones carry the sending app's clock. See [the 2026-11-03 addendum](#addendum-2026-11-03-sms-clock-offset).
5. **Multipart youth guard.** Salamek skips `MULTIPART` messages < 10s old (comment says 60s, code says 10s — trust the code) so the device can reassemble parts. Filter client-side on the corrected time, never the raw `Date`.
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

## Addendum (2026-11-03): notifications, redesign, navigation

Current shape (supersedes the `Promise.all` / 30 s details above):

- **`useAllSms`** fetches inbox then sent **sequentially**, every **10 s**, error typed `Error | null` (partial failure, shown in the list footer).
- **Navigation:** the list is the `sms` tab (`src/app/(app)/(tabs)/sms.tsx`); a conversation opens full-screen above the tabs at **`/conversation/[phone]`** (row taps and notification taps both use it). It was briefly a nested stack inside the tab; moved out when the tabs became swipeable (a sideways swipe mid-conversation would switch tabs).
- **List (`SmsList`):** heading with conversation/unread counts, search (sender, number, text) with clear, `SenderAvatar` rows (initial for named senders, person icon for numbers), unread emphasis + count badge, "You: …" when the last message is ours, short timestamps (`formatListTime`), row-shaped skeletons, empty states.
- **Conversation (`ThreadView`):** header (back, avatar, count), day separators (`formatDayLabel`), same-side bubbles within 5 min grouped, time per bubble, "Sending…" / "Not sent" under outgoing pending/failed messages, selectable text (copy OTPs), "Message still arriving…" for empty multipart parts, opens at the newest message (FlashList `startRenderingFromBottom`).
- **`isOutgoing`** (in `threads.ts`): `Smstat` 2 (pending), 3 (sent), 4 (send failed) are ours. Status 4 used to render as received.
- **HTML entities:** the device sends `/` as `&#x2F;` in SMS text; `normalizeSmsMessage` runs `decodeHtmlEntities` on `Content` and `Phone`.

### Notifications (`src/notifications/`)

`SmsNotifier` (mounted in the `(app)` layout) diffs each `["sms","all"]` result against the message indexes it has seen and posts one local notification per thread with new unread messages (`Smstat 0`). Tapping opens `/conversation/[phone]`. Foreground only (JS timers pause in the background).

Known issues, to fix in the SMS iteration:

1. `ensureSmsPermissions` requests permission **before** creating the Android channel; on Android 13+ the prompt needs a channel first.
2. The seen set is **replaced** each poll; a partial fetch followed by a full one re-notifies old unread messages. Union instead, and skip diffing when `error` is set.
3. The full SMS fetch runs every 10 s on every screen. Use `monitoring/check-notifications` `UnreadMessage` as a cheap trigger and refetch only when it rises.
4. A tap that cold-starts the app isn't handled (`useLastNotificationResponse`).

### Next SMS iteration (planned)

- `check-notifications`: `UnreadMessage` → tab badge + notifier trigger; `SmsStorageFull=1` → warning (a full store stops receiving SMS). Shapes in [`webui-endpoints.md`](./webui-endpoints.md).
- Mark read on open (`setSmsRead`), delete (`deleteSms`), compose/reply (`sendSms`, send defaults above). Use long-press menus, not swipe actions — the tab pager owns horizontal swipes.

## Addendum (2026-11-03): SMS clock offset

**Finding.** Received SMS are stored **5 h 30 min ahead** of real time (UTC+5:30 wall clock; Ghana is UTC+0).

- Measured on the 460 cached messages, read through the Metro debugger (no device requests). 71 MobileMoney messages state their transaction time (`… at 2025-07-06 16:40:57`); every one was stored exactly +330 min later, July 2025 → November 2026.
- Ecobank agrees once its 12-hour clock without am/pm is read: `Date: 03-01-2026 09:02` (pm) stored `2026-01-04 02:32:47`.
- Whether the MiFi or the SMSC adds the offset can't be told from the API (no clock endpoints, see `PROJECT.md` Device facts). It has been constant for 16 months.
- Sent messages carry the clock of the app that sent them (`sendSms` stamps the phone's local time).
- Hermes check (Lead 2): offset 0, `Africa/Accra`, `"2026-07-15T13:00:00"` → 13:00. Local vs UTC parsing gives the same instant here, so it wasn't a cause.

**Effects before the fix.**

- Replies interleaved up to 5.5 h out of place in conversations; messages after 18:30 got the next day's label.
- **The multipart guard hid new long messages for ~5.5 h** (`now - t < 10 s` stays true while the stamp is in the future). 382 of 460 messages are multipart (all MoMo and bank alerts), so they also didn't notify.

**Fix.** `normalizeSmsMessage` adds `time` (epoch ms): received (`Smstat` 0/1) = stamp read as UTC − 330 min, sent = stamp read as local time; 0 when unparseable. Sorting, grouping, day separators, the multipart guard and every formatter use `time`; `Date` stays raw (the API only needs `Index`). Verified live: MoMo `time` matches the stated time within 1 s.

**Open.**

- The offset is a constant (`RECEIVED_UTC_OFFSET_MIN` in `routes/sms.ts`). If it ever changes (firmware reset, other SIM), self-calibrate: when a poll shows a new message, `stamp − now` rounded to 15 min is the offset; persist it.
- Optional: one send (costs credit) to confirm the device keeps our `Date` for sent messages.
- One received multipart part (`+233245193550`, 2026-09-03) has had empty content since September, so it shows "Message still arriving…" forever.

**Correction (2026-11-04): the offset depends on the sending network.**

- The stamp is the sending SMS centre's timestamp (SCTS) with its zone dropped; the MiFi itself doesn't stamp. Owner's test: a message from an MTN number (`+233245193550`) stamped `08:13:48` arrived at ~02:43 GMT (+5:30); one from a Telecel number (`+233508718928`) stamped `02:42:00` arrived at ~02:42 GMT (+0). Yesterday's "boot window" message from the Telecel number was plain GMT for the same reason, not because of the restart.
- Rule in `receivedOffsetMin` (`routes/sms.ts`): delivery reports (this SIM's MTN centre) +5:30; Ghanaian numbers by network code, MTN (`24 25 53 54 55 59`) +5:30, others (Telecel `20 50`, AirtelTigo `26 27 56 57`) +0; other full numbers +0 (unknown); sender names and short codes +5:30 (all 71 MoMo and the Ecobank checks).
- `Sca` is empty on every message (482), so the centre can't be read from the data. A number ported between networks keeps its prefix and would get the wrong offset.
- `POST host/info` (`Time` `YYYYMMDDHHMMSS`, `Timezone` `GMT+0000`, then `Platform`, `PlatformVer`, `Navigator`, `NavigatorVer`; Salamek `Host.info`) is how the web UI hands the device the client's clock. A bare GET answers `100005`. Not used yet: it's unproven whether it moves the UTC+5:30 zone, and testing that costs an SMS.

## Addendum (2026-11-03): delivery reports

Sending with the default settings produces a **delivery report** in the inbox: `SmsType` 7 (success) or 8 (failure), empty `Content`, the recipient's number, stamped on the receive clock (+5:30). It arrived ~2 s after the send.

- `useAllSms` keeps reports out of `messages` (they'd show as empty "still arriving" bubbles and trigger notifications) and returns them as `reports`.
- `deliveryByIndex` matches each report to the latest sent message to that number at or before it (1 min slack for the two clocks). The thread shows "Delivered" under the latest outgoing message and "Not delivered" on any failure.
- Reports are marked read with their conversation (otherwise they hold up `UnreadMessage`) and deleted with it.
- The MiFi dropped the two newest reports a few minutes after they arrived (complete fetch, nothing deleted them); older ones stayed. `useAllSms` keeps reports already seen in the session so "Delivered" doesn't disappear.

## Addendum (2026-11-04): learned per-sender offsets

- No zone is reachable on this firmware: `sms-list` drops the SCTS offset, `api/sms/config` reports `smsisusepdu: 0` (no PDU path seen in the web UI), the web UI never posts `host/info` and itself shows the wrong times. The MTN centre address is `+233244500000`.
- `src/sms/clock.ts` learns each sender's offset from messages seen arriving: when the previous fetch was under 90 s earlier, a new received message's stamp (read as UTC) minus the fetch time is rounded to 15 min; it's accepted only if the leftover is between −2.5 and +0.5 min (delayed deliveries fall outside) and within ±14 h. Offsets persist in SecureStore (`mifi.smsOffsets`, sender key → minutes) and re-time that sender's whole history.
- Senders never seen arriving keep the network rule in `defaultOffsetMin`.
