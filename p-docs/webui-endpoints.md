# Web UI Endpoints — Captured Responses

Source: HAR export of the device web UI (E5576-320, firmware `11.0.1.1`), captured 2026-11-03. Field names and value formats below are **observed on our device**, not inferred. Identifiers (IMEI, MACs, IPs, host names) were masked during analysis and are not recorded here.

All calls are `GET`. The web UI sent **no `__RequestVerificationToken` on GETs** — consistent with our `pickToken()` (GETs only attach a token when one is left in the pool). The HAR has since been deleted; this file is the record.

## Transport (what the web UI sends and gets back)

Request headers on every API call (cookie stripped by the sanitized export):

| Header             | Value                                  | Our client                                                        |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------- |
| `Referer`          | `http://192.168.8.1/html/content.html` | sends `/html/home.html` — works; switch if a call ever rejects it |
| `X-Requested-With` | `XMLHttpRequest`                       | not sent                                                          |
| `_ResponseSource`  | `Broswer` (sic)                        | not sent                                                          |
| `Update-Cookie`    | `UpdateCookie` (literal)               | not sent; only on `monitoring/status`                             |

Response headers:

- `Content-Type: text/html` for **every** XML response — never `application/xml`. Don't branch on content type; parse the body.
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` — no client-side HTTP caching to rely on.
- No `Set-Cookie` and no `__RequestVerificationToken*` headers on these GETs.

Latency on local Wi-Fi: 8–220 ms per call (`lan/HostInfo` slowest at ~220 ms / 9 KB). Our 10 s XHR timeout and 4 s probe timeout are generous.

Repeated calls ~3 s apart (`monitoring/status`, `net/current-plmn`) returned identical bodies.

## Already used by the app

### `monitoring/status`

Sample: `ConnectionStatus=901` (connected), `SignalIcon=5`/`maxsignal=5`, `CurrentNetworkType=19`, `CurrentNetworkTypeEx=101` (LTE), `BatteryStatus=1`, `BatteryLevel=3`, `BatteryPercent=75`, `CurrentWifiUser=2`, `TotalWifiUser=16`, `SimStatus=1`, `WifiStatus=1`, `flymode=0`.

- `BatteryStatus`: `1` = charging, `0` = not (owner-confirmed). `BatteryRingCard` already reads it this way.
- `CurrentWifiUser` = connected clients now; `TotalWifiUser` = client limit.

### `monitoring/traffic-statistics`

| Field                                       | Meaning                                        |
| ------------------------------------------- | ---------------------------------------------- |
| `CurrentDownload` / `CurrentUpload`         | bytes since the **current connection** started |
| `CurrentConnectTime`                        | seconds connected (≈57 h in the sample)        |
| `CurrentDownloadRate` / `CurrentUploadRate` | **bytes/second** right now                     |
| `TotalDownload` / `TotalUpload`             | **lifetime** bytes (397 GB down in the sample) |
| `TotalConnectTime`                          | lifetime seconds                               |

**Bug this exposes:** `DataRingCard` plots `TotalDownload` (lifetime) against a 5 GB cap, so the ring is always full. Use `month_statistics` instead.

## New

### `net/current-plmn` — carrier

`State=0`, `FullName=MTN`, `ShortName=MTN`, `Numeric=62001`, `Rat=7`, `Spn=` (empty).

- `FullName` is just "MTN" — the "Ghana" in the mock is not in the response. `Numeric` = MCC `620` (Ghana) + MNC `01`; a small MCC→country map could produce "MTN Ghana" if wanted.
- `Rat=7` matches 3GPP access technology E-UTRAN (LTE).
- Replaces the hard-coded `carrier = "MTN GH"` in `HeroCard`.

### `monitoring/check-notifications` — cheap change detector

`UnreadMessage=220`, `SmsStorageFull=0`, `OnlineUpdateStatus=14`, `SimOperEvent=0`.

- `UnreadMessage`: unread SMS count → SMS tab badge, and the trigger for refetching the full SMS list (instead of fetching every message every 10 s).
- `SmsStorageFull=1` means the device stops accepting new SMS → show a warning in the SMS tab.
- Note: `sms-count` reported `LocalUnread=73` on 2026-09-10; this is a different day, so the two can't be compared yet. Check both on the same poll before relying on either for the badge.

### `monitoring/month_statistics` — billing-cycle usage

| Field                  | Sample        | Meaning                    |
| ---------------------- | ------------- | -------------------------- |
| `CurrentMonthDownload` | `15227921515` | bytes this cycle           |
| `CurrentMonthUpload`   | `2315632485`  | bytes this cycle           |
| `MonthDuration`        | `201564`      | seconds online this cycle  |
| `MonthLastClearTime`   | `2026-11-01`  | cycle start (`YYYY-MM-DD`) |
| `CurrentDayUsed`       | `3508059024`  | bytes today (down + up)    |
| `CurrentDayDuration`   | `16886`       | seconds online today       |

Cycle usage for the data ring = `CurrentMonthDownload + CurrentMonthUpload`.

### `monitoring/start_date` — data plan

`StartDay=1`, `DataLimit=0MB`, `DataLimitAwoke=0`, `MonthThreshold=90`, `DayThreshold=90`, `SetMonthData=0`, `trafficmaxlimit=0`, `turnoffdataenable=0`, `turnoffdataswitch=0`, `turnoffdataflag=0`.

- `DataLimit` format: number + unit, e.g. `0MB` (expect `MB`/`GB`). Parse both.
- `SetMonthData=0` → **no plan configured on this device**. The ring should then show usage without a cap (and could offer to set one).
- `MonthThreshold`/`DayThreshold`: warning percentages.
- `turnoffdata*`: auto-disable mobile data at the limit.
- Setter (Salamek `set_start_date`): POST with `StartDay`, `DataLimit`, `MonthThreshold`, `SetMonthData=1` **in that order**.

### `lan/HostInfo` — connected devices (Devices tab)

`<Hosts><Host>…</Host>…</Hosts>`. Sample had 21 hosts (history), **2 with `Active=1`** — matching `CurrentWifiUser=2`.

Host fields: `Active`, `ActualName`, `HostName`, `IpAddress`, `MacAddress`, `AddressSource` (`DHCP`), `AssociatedSsid`, `AssociatedTime` (seconds; set only for active hosts), `LeaseTime`, `InterfaceType` (`Wireless`/`Ethernet`), `isLocalDevice` (`1` = the device making the request), `ID`.

- Filter `Active=1` for "connected now"; `isLocalDevice=1` can be labelled "This phone".
- `IpAddress` is `IPv4` or `IPv4;IPv6` (semicolon-separated) — split on `;`.
- `MacAddress` is colon-separated (`aa:bb:cc:dd:ee:ff`).
- `HostName` and `ActualName` were identical for all 21 hosts and never empty.
- Sample active hosts: one with `isLocalDevice=1` (the browsing phone, `AssociatedTime≈21900 s`), one other wireless client (`≈23300 s`); inactive hosts have empty `AssociatedTime` and `LeaseTime=0` once expired. One `Ethernet` host appeared (inactive) — likely USB tethering.
- Response is ~9 KB for 21 hosts; poll it slowly (e.g. 30 s), not on the 8 s status cycle.
- Single-host responses will arrive as an object, not an array — normalize like `sms-list`.

### `pin/status` — SIM state

`SimState=257`, `PinOptState=258`, `SimPinTimes=3`, `SimPukTimes=10`. With the SIM working normally, `257` is the "ready" state; other values (PIN/PUK required) are unconfirmed. Useful later for a "SIM locked" screen.

### `wlan/status-switch-settings`

`<radios><radio><wifienable>1</wifienable><index>0</index>…</radio></radios>` — Wi-Fi radio on/off.

### `user/heartbeat`

`<userlevel>2</userlevel>`. The web UI calls it as a session keep-alive. Our regular polling probably keeps the session alive already; worth trying if sessions expire while the app sits on a quiet screen.

### `monitoring/converged-status`

`SimState=257`, `SimLockEnable=0`, `CurrentLanguage=en-us`.

### `cradle/status-info`

Returns `<error><code>100002</code></error>` — not supported on the E5576 (no Ethernet cradle). Skip.

## Not captured

- `monitoring/month_used` — not in this HAR; capture it separately if needed.
- Request cookies — the sanitized export strips them.
- Polling cadence — the capture covers only ~3.4 s (initial load, then a second round at ~3 s with `heartbeat`).
