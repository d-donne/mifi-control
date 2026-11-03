# Dashboard — Progress Tracker

The home screen and app shell, built against the mock in `assets/ui-frame.png` (dark theme, rounded cards, blue accent; untracked, never committed). Updated 2026-11-03.

## Decisions locked in

- **Tabs:** swipeable pages (`expo-router/js-top-tabs`, bar at the bottom) with a custom floating pill (`components/TabBar.tsx`) whose highlight follows the swipe. Detail screens (conversation, data plan) open **above** the tabs, Telegram/Truecaller style.
- **Live throughput chart:** deferred; the hero card shows live rates only.
- **Data usage:** current billing cycle (`month_statistics` download + upload) against the device's own data plan (`start_date`) when one is set. The old hard-coded 5 GB cap is gone.
- **Carrier name:** `net/current-plmn` `FullName` ("MTN"). The mock's "MTN Ghana" would need an MCC → country map (`Numeric 62001`).
- **Wi-Fi quick action:** toggles mobile data (`setMobileData`).

## Built

```
src/app/(app)/(tabs)/
  _layout.tsx        TopTabs, custom TabBar
  index.tsx          Home
  devices.tsx        DeviceList
  sms.tsx            SmsList
  settings.tsx       device + connection info, sign out
components/
  TabBar.tsx         floating pill, sliding highlight, useTabBarClearance()
  dashboard/
    Header.tsx       greeting + last updated + profile button
    HeroCard.tsx     device name, online dot, network type, carrier, signal, live rates
    SignalConfig.tsx / SignalPattern.tsx
    UsageStats.tsx   battery + data rings side by side
    StatRingCard.tsx shared ring card
    BatteryRingCard.tsx  BatteryPercent, charging icon from BatteryStatus
    DataRingCard.tsx     cycle usage, plan-aware, warning/danger colours, today's usage
  common/            CircularProgress, PulsingDot, GradientText
  devices/DeviceList.tsx
```

- [x] Navigator scaffolding (tabs, settings moved into tabs)
- [x] Custom tab bar (now swipe-aware)
- [x] Header + hero card with live data
- [x] Battery and data rings (data ring fixed to cycle usage)
- [x] Devices tab list (`lan/HostInfo`)
- [x] Test screen removed
- [ ] Data ring tap → data plan sheet (Phase 6)
- [ ] Home "N devices connected" card (mock) — data is in `["hosts"]` / `CurrentWifiUser`
- [ ] Quick actions: mobile data toggle, Share and Speed test placeholders
- [ ] Remove the diagnostic `console.log`s in `triggerLogin()`
- [ ] Visual review in light mode

## Deferred

- Live throughput chart (needs a faster polling layer)
- Device avatars on the home card
- "vs. yesterday" trend (needs a local history layer)
- Speed test (no endpoint), Share/QR
- Devices tab: some connected devices don't appear — investigate
