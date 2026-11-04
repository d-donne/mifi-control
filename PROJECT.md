# Mobile WiFi Manager for Huawei — Project Tracker

A custom Expo (React Native + TypeScript) app that controls a Huawei E5576-320 MiFi directly through its local HiLink HTTP API, replacing the official "AI Life" app. No backend: the phone talks to the device at `http://192.168.8.1` over the MiFi's Wi-Fi.

This file is the single source of truth for project state. Research lives in [`p-docs/`](./p-docs/).

---

## Resume here

_Last updated 2026-11-04._

**Git state when this was written** (check `git log` / `git status` first)

- Everything is committed through `fix(dependencies): update fast-xml-parser, oxfmt, and oxlint`. This docs update is the last pending commit.
- Untracked on purpose, never commit: `assets/ui-frame.png` (the dashboard design mock) and any `*.har` capture.

**Next action: the first release build on the owner's phone.**

- `bunx eas-cli build -p android --profile preview`, then open the link on the phone and install (no developer mode; Android only asks to allow installs from that source). It's a fresh install: sign in again.
- JS-only changes after that: `bunx eas-cli update --channel preview --environment preview --message "…"`. The phone runs a new update within two cold starts. Native changes need a new build.

**SMS rules learned the hard way**

- The device keeps one session: never fetch boxes in parallel; SMS writes share one mutation scope.
- `Index` is a storage slot and gets reused after deletes: identify a message by `messageKey` (`Index:Date`).
- Received stamps carry the sending centre's zone (MTN +5:30, others +0): keep `Date` raw and derive `time` (`smsTime` + learned offsets in `src/sms/clock.ts`).
- Sender IDs can be names, not numbers. `Count` in `sms-list` isn't a total. Message text needs `decodeHtmlEntities`.
- Confirm with `ConfirmDialog`, never `Alert.alert`. Use long-press menus; swipe actions would fight the pager.

**Running the app**

- JS-only changes: `bunx expo start` with the installed dev client (Metro on :8081); fast refresh applies edits.
- After adding a native module: rebuild the dev client with `bun run android` (`expo run:android`). Add `--no-bundler` when Metro is already running.
- An Android emulator (`emulator-5554`) is used for checks: `adb -s emulator-5554 exec-out screencap -p > shot.png`, `adb shell input tap x y`. The Expo dev client's floating gear button is not part of the app.
- Release builds: EAS profiles in `eas.json` (`preview` = installable APK on channel `preview`, `development` = dev client on channel `development`).
- New routes or `Stack.Screen` options need a full app restart (`adb shell am force-stop com.ddonne.mobilewifimanager`, then relaunch); fast refresh doesn't pick them up.
- The owner sometimes uses the emulator at the same time. Screenshot before every tap; if taps turn into swipes or a touch dot shows, stop sending input. **Never** test mobile data off or restart on the live MiFi without asking: both cut everyone's internet.
- Live app state without touching the MiFi: Metro's debugger (CDP) `Runtime.evaluate` on the dev app. Hermes doesn't await promises there: store async results on a global and read them back.
- In dev, React Native's error overlay covers the root `ErrorBoundary`; the boundary screen only shows in release builds.

---

## How we work

Conventions the owner set; follow them.

- **Small phases.** Break work into phases; each phase is one commit. Brainstorm before structural UI or navigation changes. Don't build several phases in one go.
- **Per phase:** review the diff → format (`bunx oxfmt <files>`) → lint (`bunx oxlint <files>`) → typecheck → stage **only that phase's files** → confirm the staged snapshot typechecks on its own → hand over a commit message. The owner reviews, tests on device, commits, and says "next".
  - Staged-snapshot typecheck: `git checkout-index -a --prefix=<tmp>/`, symlink `node_modules` into it, run `node_modules/.bin/tsc --noEmit` there.
  - Staging part of a file (interactive `git add -p` isn't available): write the wanted version to a temp file, then `git update-index --cacheinfo "100644,$(git hash-object -w <tmp>),<path>"`.
- **Commit messages:** conventional style used in this repo, `type(scope): summary` plus short bullets saying what changed and why.
- **Never delete Gluestack components** in `components/ui/` even when unused; they were added up front because adding them after upgrades tends to break.
- **Don't add `*.har` or `assets/ui-frame.png` to `.gitignore`;** they're simply never committed.
- **Check UI on the emulator** (screenshots) when it's available.
- `AGENTS.md` still applies: explain before editing unless asked; read Expo docs for the installed SDK, not memory.

---

## Stack

| Area            | Choice                                                                                                                        | Version                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Framework       | Expo SDK 58, React 19.3, React Native 0.88 (new architecture, Hermes V1)                                                      | `expo ~58.0.23`, `react-native 0.88.1` |
| Language        | TypeScript 7 (native `tsc`); excluded from `expo install` checks via `expo.install.exclude`                                   | `^7.0.2`                               |
| Package manager | Bun (`bunx`, `bunx expo install <pkg>`)                                                                                       | —                                      |
| Routing         | Expo Router, protected routes, `expo-router/js-top-tabs` for swipeable tabs                                                   | `~58.0.30`                             |
| Pager           | `react-native-tab-view` + `react-native-pager-view` (native)                                                                  | `^4.3.4`, `9.0.7`                      |
| Data            | TanStack Query for all device data; polling via `refetchInterval`                                                             | `^5.102.8`                             |
| Session state   | Zustand (`useSession`)                                                                                                        | `^5.0.16`                              |
| UI              | Gluestack UI (Uniwind adapter) + Uniwind classes, lucide icons, FlashList                                                     | `uniwind ^1.3.0`, `flash-list 2.3.2`   |
| Animation       | Reanimated 4 (React Compiler on: use `.get()`/`.set()`)                                                                       | `4.7.1`                                |
| XML             | `fast-xml-parser` (`parseTagValue: false`) + `fast-xml-builder`                                                               | `^5.12.0`                              |
| Lint / format   | Oxlint (type-aware + type-check via `oxlint-tsgolint`), Oxfmt (`printWidth 80`, Tailwind class sort, `package.json` sort)     | `^1.91.0`, `^0.76.0`                   |
| Builds          | EAS Build (APK profiles), EAS Update (`expo-updates`, runtime policy `fingerprint`), `expo-build-properties` (cleartext HTTP) | `expo-updates ~58.0.21`                |

Scripts: `bun run lint`, `lint:fix`, `fmt`, `fmt:check`, `android`, `prebuild`, `start`.

### Runtime gotchas (learned the hard way)

- **Hermes on the dev build lacks `Array.prototype.toSorted`/`toReversed`** (crash: `undefined is not a function`). Use `[...arr].sort()`; `unicorn/no-array-sort` and `no-array-reverse` are off for this reason.
- **React Compiler is on**: never write Reanimated `sharedValue.value`; use `.set()` / `.get()`.
- **Uniwind types `Switch`'s `className` as `never`**: size the Gluestack `Switch` via `style`.
- **Wire values are strings** (`parseTagValue: false`); each route coerces with `num`/`flag`/`str` from `src/api/utils`. Implicit coercion used to eat leading zeros in phone numbers.
- **SMS text contains HTML character references** (`/` arrives as `&#x2F;`); `decodeHtmlEntities` runs in the SMS normalizer.
- **All XML responses are `Content-Type: text/html`**; parse the body, never branch on the content type.
- **XHR has a 10 s timeout** (`xhrRequest`); the sign-in reachability probe uses 4 s.
- **`useHiLinkQuery` only polls on focused screens** (`subscribed` follows `useIsFocused()`): pager tabs stay mounted. Anything that must poll everywhere (SMS heartbeat, notifier) lives in `(app)/_layout.tsx`, which stays focused. Plain `useQuery` (`useAllSms`) isn't gated.
- **Queries retry once.** The global error toast fires only when the query has no data, and the same message at most once per 30 s.
- **Android fixes a notification channel's settings when it's created** (the `sms` channel is lock-screen private). To change them, use a new channel id.
- **Release builds block cleartext HTTP** unless `expo-build-properties` sets `usesCleartextTraffic` (it does); dev builds allow it, so a missing setting only shows in the APK.
- **Stale Metro bundles** show up as `undefined is not a function` right after edits; restart with `bunx expo start --clear` before assuming a code bug.

---

## Architecture

### Routes (`src/app/`)

```
_layout.tsx              providers, SplashScreenController, RootNavigator:
                         Stack.Protected guard on status === "connected";
                         exports ErrorBoundary (AppErrorBoundary)
sign-in.tsx              available while not connected (SignInScreen)
(app)/                   available while connected
  _layout.tsx            HiLinkProvider (client context) + SmsNotifier + Stack
                         (animation: slide_from_right)
  (tabs)/_layout.tsx     TopTabs, tabBarPosition "bottom", custom TabBar,
                         lazy + lazyPreloadDistance 1
  (tabs)/index.tsx       Home: Header (greeting), HeroCard (network, carrier,
                         signal, uptime), UsageStats (battery ring, data ring →
                         data plan sheet), DevicesSummaryCard (→ Devices
                         tab), QuickActions (mobile data toggle)
  (tabs)/devices.tsx     DeviceList
  (tabs)/sms.tsx         SmsList
  (tabs)/settings.tsx    device info + uptime, controls (mobile data, restart),
                         data plan row, connection, sign out
  conversation/[phone].tsx  ThreadView, full screen above the tabs
  data-plan.tsx          form sheet: DataPlanEditor
  device/[mac].tsx       form sheet: DeviceDetail (info, rename, block, remove)
```

Signing in/out only flips the session status; the guards redirect. No manual navigation in auth code.

Sheets share one options object in `(app)/_layout.tsx`: `presentation: "formSheet"`, detents `[0.75, 1]`, `sheetCornerRadius: 28`, and the background via `contentStyle` (the Android sheet tints its rounded shape with it; a background painted by the screen itself hides the corners).

### Session and auth

- **`src/hooks/useSession.ts`** (Zustand): `status` (`hydrating` → `signedOut` | `connecting` → `connected`), `restoring` (holds the splash during the startup reconnect, max 4 s), `credentials` (last known-good, in `expo-secure-store` keys `mifi.baseUrl`/`mifi.username`/`mifi.password`), `draft` (last attempted), `client`, typed `error` (`credentials` | `blocked` | `network` | `other`), cached `deviceName` (`mifi.deviceName`). Actions: `signIn` (connects first, persists only on success), `retry`, `signOut` (best-effort device logout). A generation counter drops superseded attempts. `hydrate()` runs on import.
- **`src/api/main.ts` `HiLinkClient`**: `connect()` (warm `state-login` gate, else home-page CSRF scrape + login), `isReachable()` (unauthenticated probe), token pool per Salamek (GET attaches a token only when one remains; POST responses refill), single-flight `loginOnce()`, one retry on `125001/2/3`. **Login rejections latch**: after `108001/2/6`, `108007` or `115002` the client never logs in again and fires `onLoginRejected`. `close()` stops a replaced client; `logout()` is best-effort.
- **`src/hooks/HiLinkProvider.tsx`**: provides the client to `(app)`; renders nothing without one; removes device queries from the cache on unmount (keeps `["probe", …]`).
- **`components/auth/SignInScreen.tsx`**: device reachability card, password-first form (username/address under a toggle), per-error messages, auto-retry once the MiFi becomes reachable **only with known-good credentials**.

### API (`src/api/`)

- `routes/monitoring.ts`: `getMonitoring(client, "status" | "traffic-statistics" | "month_statistics" | "start_date" | "check-notifications")` via a coercion table; `setDataPlan` (POST `start_date`, Salamek field order).
- `routes/device.ts` (`information`, decoded HTML entities; `reboot`), `routes/dialup.ts` (`getMobileData`, `setMobileData`), `routes/net.ts` (`getCurrentPlmn`).
- `routes/sms.ts`: `getSmsList`, `fetchAllSms` (pages until empty, multipart youth guard), `getSmsCount`, `setSmsRead`, `deleteSms`, `sendSms`; `smsTime` / `defaultOffsetMin` (received stamps by sending network), `isDeliveryReport`. Learned per-sender offsets: `src/sms/clock.ts`.
- `routes/lan.ts`: `getLanHosts` (names decoded), `renameDevice` (`lan/changedevicename`), `forgetDevice` (offline hosts only), `splitHostAddresses`.
- `routes/wlan.ts`: `getMacFilter` (block list of SSID 0), `blockDevice` / `unblockDevice`. Both read the list fresh, refuse allow-list mode, never block the requesting device, cap at 32, and write the whole list in the web UI's shape.
- `HiLinkClient.request` throws on non-2xx responses after checking for a device `<error>` body.
- `errors/index.ts`: code sets, `NETWORK_ERROR_CODE`, `SESSION_CLOSED_CODE`, `isLoginRejection`.
- `utils/`: `num`/`flag`/`str`, `decodeHtmlEntities`, `formatBytes`, `parseDataLimit`, `formatNetRate`, date helpers (`formatListTime`, `formatDayLabel`, `formatClockTime`, `formatDuration`, …), `xhrRequest` (Cookie-header workaround: RN `fetch` drops `Cookie`).

### Queries

| Key                 | Source                                     | Poll                                   | Used by                                         |
| ------------------- | ------------------------------------------ | -------------------------------------- | ----------------------------------------------- |
| `["status"]`        | `monitoring/status`                        | 8 s                                    | Header, HeroCard, BatteryRingCard, DeviceList   |
| `["traffic"]`       | `monitoring/traffic-statistics`            | 2 s                                    | HeroCard (live rates)                           |
| `["device"]`        | `device/information`                       | 60 s                                   | HeroCard, Settings                              |
| `["plmn"]`          | `net/current-plmn`                         | 60 s                                   | HeroCard carrier                                |
| `["month"]`         | `monitoring/month_statistics`              | 30 s                                   | DataRingCard                                    |
| `["plan"]`          | `monitoring/start_date`                    | stale 5 min                            | DataRingCard, Settings, DataPlanEditor          |
| `["hosts"]`         | `lan/HostInfo`                             | 30 s                                   | DeviceList, DeviceDetail                        |
| `["macfilter"]`     | `wlan/multi-macfilter-settings-ex`         | 30 s                                   | DeviceList (Blocked), DeviceDetail              |
| `["mobile-data"]`   | `dialup/mobile-dataswitch`                 | 30 s                                   | QuickActions, Settings                          |
| `["notifications"]` | `monitoring/check-notifications`           | 5 s                                    | TabBar badge, SmsList (storage full), heartbeat |
| `["sms","all"]`     | `fetchAllSms` inbox then sent (sequential) | 60 s (10 s while settling) + heartbeat | SmsList, ThreadView, SmsNotifier, ComposeSheet  |
| `["probe", url]`    | `HiLinkClient.isReachable`                 | 3 s until reachable                    | SignInScreen                                    |

Shared query hooks: `useHiLinkQuery` (injects the client, pauses unfocused screens), `useStatus` / `useTraffic` / `useDeviceInfo` / `usePlmn` (`useDeviceStatus.ts`), `useAllSms` / `useDeviceNotifications` / `useSmsHeartbeat` (`useAllSms.ts`; the heartbeat refetches SMS when `UnreadMessage` changes), SMS mutations `useMarkRead` / `useDeleteSms` / `useSendSms` (`useSmsActions.ts`, one `sms-write` scope), `useDataPlan` / `useMonthStatistics` (`useDataUsage.ts`), `useLanHosts`, `useMacFilter` + device mutations (`useDeviceActions.ts`; block/unblock/rename/forget share a mutation `scope` so list rewrites never interleave), `useMobileData` / `useSetMobileData` (optimistic) / `useReboot` (`useMifiControls.ts`).

### UI building blocks

- `components/TabBar.tsx`: floating pill; highlight follows the pager `position`; `useTabBarClearance()` gives the bottom padding for tab pages.
- `src/hooks/useAppColors.ts`: JS mirror of `global.css` tokens as `rgb(...)` strings (keep in sync by hand).
- `components/devices/`: `DeviceList` (capacity card, connected, blocked, previously connected), `DeviceDetail`, `hostDisplay.tsx` (`displayName` with `ActualName`, "Unnamed device" for MAC-only names, `DeviceIcon` guessed from the name).
- `components/dashboard/`: `HeroCard` (network, carrier, signal, live rates, uptime), `DevicesSummaryCard` (avatar stack, `router.navigate("/devices")` switches tabs), `QuickActions` (round buttons on a 4-column grid; toggles act immediately and show On/Off).
- `formatNetRate` shows bit rates (`kbps` / `Mbps`); it used to label kilobits as "KB/s".
- `components/common/ConfirmDialog.tsx`: in-app confirmation (Gluestack `AlertDialog`, card background, pill buttons). Used for restart, block, remove and sign out. **Don't use the native `Alert.alert`**: the owner finds it out of place. Toggles (mobile data) never confirm.
- `components/sms/`: `SmsList` (search across all messages, new-message button), `ThreadView` (reply bar, delivery status, mark read on open), `Composer` (character/SMS count, "Not sent" line), `ComposeSheet`, `MessageActions` (long-press: copy codes/text, delete), `SenderAvatar`; pure selectors in `threads.ts` (`messageKey`, `groupThreads`, `filterThreads`, `threadMessages`, `deliveryByIndex`, `copyableNumbers`, `canReply`, `smsSegments`).
- `src/notifications/`: `SmsNotifier` (local notification per thread with new unread SMS, keyed by `messageKey`; tap opens `/conversation/[phone]`, also from a cold start); `sms` channel is lock-screen private.
- `components/dashboard/Header.tsx`: greeting plus data freshness; turns red with "Can't reach the MiFi" when status polls fail (Home only for now).
- `components/common/AppErrorBoundary.tsx`: root error screen (plain RN: it renders outside the providers; hides the splash).
- Design reference: `assets/ui-frame.png` (dark, rounded cards, blue accent). Gluestack primitives in `components/ui/*`.

---

## Device facts (Huawei E5576-320)

Firmware `11.0.1.1(H697SP11C00)`, WebUI `11.0.1.1(W11SP6C03)`. Full captured endpoint shapes: [`p-docs/webui-endpoints.md`](./p-docs/webui-endpoints.md). Protocol background: [`p-docs/salamek-reference.md`](./p-docs/salamek-reference.md).

**Session and login**

- The session cookie is `SessionID` (the `<SesInfo>` XML tag name is not the cookie name).
- Login is mandatory for protected endpoints. `GET /api/user/state-login` works **unauthenticated** (`State: -1`, `password_type: 4` pre-login); the sign-in probe relies on this. `sms-count` also answers unauthenticated.
- Login flow: GET `/` → scrape `<meta name="csrf_token">` tokens + `Set-Cookie: SessionID` → POST `user/login` with the first token. Some firmware doesn't re-issue `Set-Cookie` on login; keep the home-page cookie then.
- Password hash (`password_type: 4`): `base64(hex(sha256(username + base64(hex(sha256(password))) + token)))`, base64 of the **hex string**.
- `Referer` is required on login. The client sends `<baseUrl>/html/home.html` (the web UI itself sends `/html/content.html`); confirmed working.
- Token pool after login: observed size 2 on this device. The client follows Salamek: prefer `__RequestVerificationTokenone`+`two`, fall back to the `#`-delimited `__RequestVerificationToken`.
- **The device keeps one session.** Two clients logging in independently invalidate each other's `SessionID` (this caused SMS fetch races and is why replaced clients are closed).

**Error codes**

| Code                           | Meaning                                            | Handling                                                    |
| ------------------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| `125001`/`125002`/`125003`     | token/session invalid                              | one shared re-login, retry once                             |
| `108001` / `108002` / `108006` | wrong username / password / either                 | **never retry**; show on the form                           |
| `108007`                       | too many attempts (lockout)                        | **never retry**; tell the user to wait                      |
| `115002`                       | admin password must be changed first               | **never retry**; tell the user to change it on the web page |
| `108003`                       | already logged in                                  | treat as success                                            |
| `100002`                       | endpoint not supported (e.g. `cradle/status-info`) | skip                                                        |

**Do not brute-force the login.** Every failed attempt counts toward the lockout; the client latches after a rejection so polls can't burn attempts.

**Data**

- `monitoring/status`: `ConnectionStatus 901` = connected; `BatteryStatus 1` = charging; `CurrentWifiUser` / `TotalWifiUser` (limit).
- `traffic-statistics`: `Current*` = this connection, `Total*` = lifetime, rates in bytes/s. Cycle usage comes from `month_statistics`.
- `start_date`: `SetMonthData 0` = no plan (this device); `DataLimit` like `"0MB"`/`"20GB"`.
- `current-plmn` `FullName` is `"MTN"` (`Numeric 62001` = Ghana + MTN).
- `lan/HostInfo`: `HostName` is what the device reports, `ActualName` what was set in the web UI (equal until renamed). No-name devices get their MAC with dashes. Rename = `lan/changedevicename {ID, ActualName}`; there's no reset, rename back to `HostName`. Names max 64 bytes.
- Block list: `wlan/multi-macfilter-settings-ex` (read), `wlan/multi-macfilter-settings` (write, **replaces the whole list**). `wifimacfilterstatus` 0 off / 1 allow-list / 2 block-list (this device: 2). Allow-list writes can lock out every device including the phone. Details in `p-docs/webui-endpoints.md`.
- Mobile data: `dialup/mobile-dataswitch` (`dataswitch` 0/1).
- **No wall clock on this firmware.** `sntp/timeinfo`, `serverinfo`, `sntpswitch` → `100002`, `sntp/settings` → `100003` (although `global/module-switch` says `sntp_enabled=1`). `system/onlinestate`, `system/HostInfo` → `100002`; `system/deviceinfoex` → `100003`. Uptime exists: `uptime` in `device/information`, `UpTime` in `system/deviceinfo` (that endpoint answers **JSON**, which the XML parser turns into `{}`).
- `traffic-statistics` `CurrentConnectTime` was larger than the uptime (2d 18h vs 2d 13h), so it isn't the current session length; not shown.
- SMS: see [`p-docs/sms-research.md`](./p-docs/sms-research.md) (POST `sms-list` with ordered body, `Count` isn't a total, fetch until an empty page, sequential boxes, alphanumeric sender IDs, received stamps by sending network).
- SMS storage: `LocalMax 500` shared by inbox and sent; `Index` = 40000 + slot, the lowest free slot is reused; `delete-sms` frees a slot at once (no trash). It holds ~480 messages at ~8 new a day, so it fills in days. `sms/config`: `SaveMode 0` (device storage), `Sca +233244500000`, `sms_forward_enable 0` (a forwarding switch exists, unexplored). Measurements: [`p-docs/sms-backup.md`](./p-docs/sms-backup.md).

---

## Status

| Area        | State                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tooling     | SDK 58, TS 7, Oxlint/Oxfmt; typecheck and lint clean; `expo-doctor` 20/20                                                            |
| Release     | EAS project `mobile-wifi-manager`, preview APK profile, OTA updates configured; **first build pending**                              |
| Auth        | Sign-in flow, splash restore, lockout-safe client, sign out — **verified on device**                                                 |
| Home        | Greeting with freshness/offline line, hero (rates + uptime), rings, devices summary, quick actions — verified                        |
| Data plan   | Bottom sheet from Home and Settings; saving a plan verified by the owner                                                             |
| Devices tab | Capacity, connected, blocked, previously connected; detail sheet with rename / reset name / block / unblock / remove                 |
| SMS         | List, conversations, search, compose/reply, copy/delete, delivery status, badge, notifications, learned clock offsets — owner-tested |
| Navigation  | Swipeable tabs, conversation above tabs, form sheets; only the focused screen polls                                                  |

Live checks still owed on the real MiFi: mobile data off/on and restart. Removing an offline device works (owner-tested); the MiFi keeps listing a removed device for a while, so removal is optimistic and every hosts fetch hides it until the MiFi drops it (max 60 s, `useLanHosts.ts`).

---

## Next steps (ordered)

1. **First release build** and install on the owner's phone (see Resume here). Runtime policy is `fingerprint`: native dependencies, config plugins, app config and icons are hashed, so any native change gets a new runtime and updates only reach builds they fit. A fingerprint change means a new build.
2. **App icon and splash:** still Expo's template images and colours. Needs an image from the owner.
3. **Offline indicator on every tab** (owner's request): only the Home header shows "Can't reach the MiFi"; other tabs look healthy while their data is stale.
4. **SMS backup (cloud sync):** research in [`p-docs/sms-backup.md`](./p-docs/sms-backup.md): local SQLCipher archive → Cloudflare Worker + D1, end-to-end encrypted, a message leaves the MiFi only once both copies exist. Nothing deletes automatically.
5. **SMS notifications while the app is closed:** first check the web UI for the MiFi's own SMS forwarding (`sms_forward_enable`; instant, probably costs credit). Otherwise `expo-background-task` (WorkManager, ≥15 min, needs the phone on the MiFi's Wi-Fi, logs in each run), built together with the backup sync. A foreground service (near real time, persistent notification, Android 14/15 limits) only if delays are unacceptable.
6. **Profile button → account settings** (change the admin password and similar), when the app's messages and auth screens get their pass; removed from the Home header until then.
7. Minor: received times can read a few seconds ahead of the sender's clock (the owner will flag it if it matters).
8. Later: lockout countdown (response field unknown), re-validate the session on app foreground (auth slice E), Wi-Fi share QR (blocked: the password is empty in `wlan/multi-basic-settings` and `wlan-guide-settings`, `oled-showpassword` → `100003`; needs a HAR of the web UI showing the password, or a password the owner enters once), throughput chart (tried and dropped; it didn't fit), MCC → country for the carrier label, capture `monitoring/month_used`, try `user/heartbeat` if sessions expire on quiet screens, Done button on the device sheet's title row, crash reporting (EAS Observe or Sentry).

---

## Change log

- **2026-09-03 — 125003 login bug resolved.** Rewrote `triggerLogin()` in `src/api/main.ts` to scrape the HTML home page for CSRF tokens + `Set-Cookie` (per Salamek `Session._initialize_csrf_tokens_and_session`). Added `trySesTokInfoFallback()` as a defensive path for older firmware. Added `fetchHomePage()` to wrap the home page request with user-friendly error messages. Token-pool refill on login response now follows Salamek's `refresh_csrf` priority (`one`+`two` first, full header as fallback). Module-level helpers `extractCsrfTokens`, `extractSessionIdCookie`, `extractLoginTokenPool` extracted. Cleaned up `xhr.ts` (exported `XhrResponse`, removed diagnostic `console.log`s) and `errors/index.ts` (dropped dead `ERROR_CODES` export). _Unblocks:_ the entire app — `getStatus()` polling now returns live data on-device.
- **2026-09-03 — Post-login cookie fallback added.** First on-device run revealed the E5576-320 firmware does _not_ always re-issue `Set-Cookie` on `/api/user/login`. Updated the post-login cookie extraction to keep the home-page `SessionID` when the login response has no new `Set-Cookie`, instead of throwing. Re-added two diagnostic `console.log`s at the post-login decision point (cookie + token pool size). _Unblocks:_ stable auth across firmware variants.
- **2026-09-03 — `ScrollView` import fix in `src/app/index.tsx`.** Was importing from `@expo/ui` (which doesn't export `ScrollView`). Switched to `react-native`. Removed dead `useState` for unused `result`/`loading`. Added `flex-1 bg-background` on `SafeAreaView` and `contentContainerClassName="flex-grow"` on `ScrollView` for proper layout. _Unblocks:_ UI scrolling on Android.
- **2026-09-03 — Project tracker created.** `AGENTS.md` updated with the "learning project" rules (chat-only by default, no edits without explicit permission). `PROJECT.md` created as the single source of truth. `CLAUDE.md` updated to re-export `PROJECT.md` alongside `AGENTS.md`.
- **2026-09-03 — Salamek reference section added.** Documented seven concrete learnings from the `Salamek/huawei-lte-api` Python source, with code excerpts and implications for our TS implementation. The home-page-CSRF-scrape insight (item 1) was the direct unblocker for the 125003 bug. _Unblocks:_ future protocol investigations have a starting point.
- **2026-09-03 — README rewritten.** Replaced the `create-expo-app` boilerplate with a project-specific README covering stack, status, run instructions, and config.
- **2026-09-03 — Credentials phase shipped.** `useStoredCredentials` hook (`src/hooks/useStoredCredentials.ts`) reads/writes three values from `expo-secure-store`. `HiLinkProvider` refactored to consume the hook, drop the `.env` props, and render `<Settings />` inline when no creds are present. Settings screen at `src/app/settings.tsx` built with `Card` + `FormControl` + `Heading` primitives. `_layout.tsx` cleaned up (removed unused `useUniwind` import). Test screen got a Logout button that calls `clear()` and routes to root, which renders Settings via the no-creds branch. _Unblocks:_ Phase 1 dashboard can now ship behind a real auth gate.
- **2026-09-03 — Dashboard phase started.** Plan added to "Next steps" and "Active work" sections. Will build a single-column `VStack` of `Card`s showing status, traffic, and device info. Implementation steps 1-7 enumerated. SMS list method on the client is the first concrete addition; the other steps are component work.
- **2026-09-10 — SMS v1 read list shipped + root-cause diagnosis of the search/thread bugs.** Built the read-only SMS surface: `src/api/routes/sms.ts` (full SMS client), `src/api/types/sms.ts`, `useHiLinkInfiniteQuery`, `components/sms/SmsList.tsx` (infinite scroll + live search + contact grouping), `src/app/thread/[phone].tsx` + `components/sms/ThreadView.tsx` (conversation view). Verified on-device against live E5576-320 data: search filters correctly, a thread returned its 8 messages, back returns to the list. **Critical finding:** the reported search crash and "No messages" were both stale Metro incremental dev bundles (module graph out of sync during editing → `useHiLinkInfiniteQuery` import resolved undefined), NOT code bugs. Proved it by exporting a production bundle and showing the export (line 308649) is defined before every call site (373361+) — definition-before-use is guaranteed in an atomic bundle, so this class of crash is impossible in release builds. **Dev-side fix:** baked `EXPO_NO_METRO_LAZY=1` into the `start` and `android` scripts so Metro never serves a stale lazy chunk during development. The one production code fix: wrapped root in `GestureHandlerRootView` and switched `<Slot />`→`<Stack />` in `_layout.tsx` (fixed a logcat gesture-handler error and made back-from-thread return to the SMS list instead of Home). Confirmed device facts: `sms-count` = LocalUnread 73 / LocalInbox 241 / LocalOutbox 2; SesTokInfo-mid-session token replayed externally returns `125002`. **Do not brute-force the device login** (108006 + attempt counter → lockout; app creds are in expo-secure-store, `.env` values are stale). _Unblocks:_ mark-read/delete, compose/send, tab badge, contacts integration.
- **2026-09-13 (later) — Two SMS fixes from first on-device fetch-all run.** (1) **Alphanumeric sender IDs** (telecom/bank names — no digits) were digit-stripped to `""` by the last-9 normalizer, merging every named sender into ONE phantom thread. This was the dominant cause of "most contacts missing" all along. `normalizePhone` now keys digit-poor senders by raw name (lowercased); numbers keep last-9 grouping. (2) **Intermittent footer errors:** both boxes were fetched with `Promise.all`, but the device has a single auth session and a 2–3 token CSRF pool — concurrent page loops interleave token rotation/re-login and a re-login rotates the `SessionID` cookie out from under the other loop. Boxes now fetch sequentially in `useAllSms`. Both documented in `p-docs/sms-research.md` addendum.
- **2026-09-13 — Parser boundary fix + SMS fetch-all rework.** Two root causes found and fixed after days of "some contacts/messages don't show": (1) `fast-xml-parser`'s implicit `strnum` coercion was silently destroying data at the transport boundary — `<Phone>0241234567</Phone>` arrived as `241234567` (leading zero eaten), all-digit `<Content>` (OTP codes) arrived as numbers and crashed `toLowerCase` in search. Fix: `parseTagValue: false` in `HiLinkClient`'s parser (wire is strings; routes coerce explicitly via new `num`/`flag`/`str` helpers in `src/api/utils`), with per-endpoint coercion maps in `routes/monitoring.ts` and raw `*Raw` type aliases in `types/{monitoring,traffic,device}.ts`. Phone grouping fixed to last-9-digits in `threads.ts` (`+233…`/`233…`/`0…` now one thread). (2) Pagination trusted the response `Count` as a box total — re-reading Salamek's `get_messages()` shows `Count` is only checked for zero; its real semantics are undocumented. Our `Count > fetched` logic requested out-of-range pages, the device errored, and the UI (`if (error)` before data) replaced the whole screen with a perpetual error. Fix: restructured the SMS flow to fetch-all — `fetchAllSms()` page-loop in `routes/sms.ts` (stop on empty page, 10s multipart guard, per-page errors non-fatal), single `useAllSms` hook (key `["sms","all"]`, both boxes merged, 30s poll), pure selectors in `threads.ts`, and `SmsList`/`ThreadView` reduced to thin FlashList renderers with no UI pagination. List and detail share one query so they can't disagree. Also: full datetime display in threads (`formatFullDateTime`), empty-content placeholder for pending multipart parts, and `HiLinkError` now includes the error **code** when the device sends no `<message>`. _Needs on-device verification:_ contacts/messages completeness; if still incomplete, next diagnostic is per-box coverage (SIM/MIX boxes) via a dev debug screen.
- **2026-09-03 — SMS research consolidated.** Re-fetched `Salamek/huawei-lte-api` (`Sms.py`, `enums/sms.py`, `Tools.py`) and `Salamek/huawei-lte-api-ts` (`Sms.ts`, `Connection.ts`) and wrote up the full findings in [`p-docs/sms-research.md`](./p-docs/sms-research.md): endpoint table, POST-body field order, single→array normalization, date format, multipart guard, enum values, client/UI phase slices, on-device open questions. _Unblocks:_ the next session can start implementing SMS with zero re-research. Also trimmed README to ~20 lines.
- **2026-11-03 — SDK 58, TypeScript 7, Oxlint/Oxfmt.** Upgraded Expo 57 → 58 (React 19.3, RN 0.88, gesture-handler 3, Reanimated 4.7), TypeScript 6 → 7 (excluded from `expo install` checks). Replaced ESLint with Oxlint (type-aware, `typeCheck`) and added Oxfmt. Removed `components/test.tsx`. Set app identifiers (`com.ddonne.mificontroller`), added `css.d.ts`.
- **2026-11-03 — Lint cleanup and SDK 58 fixes.** Tab bar adapted to Expo Router 58 props (`emitter`/`navigateToTab`; the old `navigation` prop would have crashed). `Referer` now comes from the stored base URL (it read `EXPO_PUBLIC_MODEM_URL`, undefined without `.env`). No sync `setState` in effects; Reanimated `.get()`/`.set()`; `useAppColors` stores `rgb()` strings. Hermes lacks `toSorted` — reverted to `sort` on copies.
- **2026-11-03 — SMS notifications.** `SmsNotifier` posts a local notification per thread with new unread SMS; tap opens the thread. Known issues listed in Next steps.
- **2026-11-03 — Auth flow.** Zustand session store replaced `useStoredCredentials` (per-instance state never reached the provider). Protected routes (`sign-in` vs `(app)`), splash held during reconnect, sign-in screen with reachability probe and per-error messages, lockout-safe client (rejection latch, closed replaced clients, best-effort logout, `115002`), 10 s XHR timeout. Settings tab shows device/connection info + sign out.
- **2026-11-03 — Web UI endpoints captured.** A HAR of the device web UI gave confirmed shapes for `current-plmn`, `check-notifications`, `month_statistics`, `start_date`, `lan/HostInfo`, `pin/status` and transport headers: [`p-docs/webui-endpoints.md`](./p-docs/webui-endpoints.md).
- **2026-11-03 — Usage, carrier, devices.** API routes for those endpoints. Data ring fixed (it showed lifetime `TotalDownload` against a made-up 5 GB; now cycle download + upload, capped only when a plan is set). Carrier from `current-plmn`. Devices tab lists connected and previously connected hosts.
- **2026-11-03 — SMS redesign.** Avatar rows, unread emphasis, short timestamps, search with clear, day separators, grouped bubbles, send status, selectable text. Fixed `&#x2F;` in SMS text (HTML entity decoding) and failed sends shown as received.
- **2026-11-03 — Swipeable tabs (staged, Phase 5).** `expo-router/js-top-tabs` with the bar at the bottom; tab highlight follows the swipe; conversation full-screen above the tabs at `/conversation/[phone]` with a slide-in. Needs the dev build with `react-native-pager-view`. Commit message:
  ```
  feat(nav): swipeable tabs with sliding indicator; conversation above tabs

  - Tabs use expo-router/js-top-tabs (react-native-tab-view +
    react-native-pager-view) with the bar at the bottom: swipe between
    pages, lazy with neighbors preloaded
  - Floating tab bar highlight follows the pager position; tabs cross-fade
    icon and label by swipe progress
  - Conversation opens full-screen above the tabs at /conversation/[phone]
    with a slide-in, matching Telegram/Truecaller-style flows
  - Home content clears the floating bar
  ```
- **2026-11-03 — Data plan sheet (Phase 6).** Data plan editor as a form sheet, opened from the Home data ring and Settings → Usage. Commit `feat(usage): data plan editor as a bottom sheet`.
- **2026-11-03 — Device info entities.** `device/information` values are HTML-decoded (firmware showed `&#40;…&#41;`). Commit `fix(device): decode HTML entities in device information`.
- **2026-11-03 — Device-management captures.** Two HARs of the web UI's device page: rename, block, unblock, plus the page script (`devicemanagement.js`) with the forget call and the 64-byte name limit. Written up in `p-docs/webui-endpoints.md`.
- **2026-11-03 — Devices UI (Phase 8).** Capacity card, device-type icons, `ActualName`, "Unnamed device", detail sheet. Commit `feat(devices): capacity card, device icons and a detail sheet`.
- **2026-11-03 — Device actions (Phase 9).** Rename and reset to the device's own name, block / unblock with a Blocked section. Request bodies checked against the captures with a fake client. Commit `feat(devices): rename, block and unblock devices`.
- **2026-11-03 — Mobile data and restart in Settings (Phase 10).** First built as a Home card; the owner moved restart to Settings. Commit message:
  ```
  feat(settings): mobile data switch, restart and uptime

  - Controls section: mobile data switch (reads dialup/mobile-dataswitch)
    and Restart MiFi
  - Restart and sign out confirm in an in-app dialog that matches the
    app, replacing the native alert; the data switch acts immediately
  - Uptime row, from device/information (the MiFi exposes no clock)
  ```
- **2026-11-03 — Remove offline devices (Phase 11).** Commit message:
  ```
  feat(devices): remove offline devices from the list

  - "Remove from list" in the sheet of a device that isn't connected,
    using the web UI's lan/HostInfo delete call
  - Refused for connected devices and this phone
  - The device leaves the list as soon as Remove is tapped; fetches keep
    hiding it until the MiFi stops listing it, since it lags behind
    its own OK, and it comes back if the request fails
  - Remove and block confirm in the in-app dialog
  ```
- **2026-11-03 — Device clock probe.** Probed 13 endpoints read-only for a wall clock; none exists (see Device facts). Greeting kept; uptime shown instead.
- **2026-11-03 — Home revamp (Phase 12).** A live throughput chart and a data plan tile were tried and dropped. Commit message:
  ```
  feat(home): devices summary, quick actions and uptime

  - Devices summary card (avatars, names) opening the Devices tab
  - Quick actions row with a mobile data toggle that acts immediately
  - Hero card shows the MiFi's uptime next to the live rates
  - Rates are shown as bit rates; kilobits were labelled "KB/s"
  ```
- **2026-11-03 — Docs restructure.** `PROJECT.md` rewritten as a resume-ready tracker; Salamek reference moved to [`p-docs/salamek-reference.md`](./p-docs/salamek-reference.md); `p-docs` trackers and README updated.
- **2026-11-03/04 — SMS iteration.** Unread heartbeat (`check-notifications`), tab badge and storage-full warning; notifier fixes (channel before permission, union of seen messages, cold-start taps); copy and delete via long-press; compose and reply with delivery reports; received times by sending network, then per-sender offsets learned from live arrivals; quieter loading placeholders. Commits `97ef0ef` … `3f2ae28`.
- **2026-11-04 — SMS backup research.** Read-only device measurements (500 slots, reused indexes, no trash) and a local-first, end-to-end encrypted design with Cloudflare: [`p-docs/sms-backup.md`](./p-docs/sms-backup.md).
- **2026-11-04 — Release prep.** Home-screen name "Mobile WiFi", package `com.ddonne.mobilewifimanager`, EAS project `mobile-wifi-manager`; Play title, if ever published, "Mobile WiFi Manager for Huawei" (brand only as compatibility). Cleartext HTTP for release builds, unused native packages removed, Expo packages aligned with SDK 58. Real phone numbers removed from the docs (they remain in git history). Commit `7dda141`.
- **2026-11-04 — Review fixes.** Only the focused screen polls; shared status/device hooks; one retry and quieter toasts; offline line in the Home header (Profile button removed); non-2xx responses throw; no `SessionID` in logs (`c0eb1e2`). SMS keyed by `Index:Date` for notifications and read marks, search over all messages, send errors shown, lock-screen-private notifications (`e8611bc`). Dead token-refill path and unused helpers removed (`803de31`).
- **2026-11-04 — Clock offsets learned only from real arrivals.** Old messages reappearing after deletes had taught MobileMoney −11 h; stricter learning, earlier offsets discarded, multipart guard bounded (`d39f9d3`). Details in `sms-research.md`.
- **2026-11-04 — Error screen, permissions, OTA.** Root `ErrorBoundary`, storage and overlay permissions blocked (`03e878a`); `expo-updates` with EAS Update channels (`3ebc0ff`).
