# Dashboard Refactor — Progress Tracker

Tracking the work to move from the current single-screen "test.tsx" layout to the
proper dashboard with a custom Tabs navigator, per the spec in the home screen
brief.

## Decisions locked in

- **Tab bar:** custom `tabBar` on `Tabs` from `expo-router` (not the default styling).
- **Live throughput:** deferred to a later phase (big numbers only in v1).
- **Wi-Fi quick action:** toggles `setMobileData` (mobile data on/off).
- **Carrier name / "vs. yesterday" trend / `/api/wlan/host-list`:** deferred to a later phase.
- **Data cap ("of 5GB"):** hardcode 5GB for v1, flag TODO to make it a Settings field.

## File plan (final state)

```
src/app/
  _layout.tsx                    # Top-level providers only; renders <RootLayout />
  (tabs)/
    _layout.tsx                  # Tabs navigator with custom tabBar
    index.tsx                    # Home dashboard
    settings.tsx                 # Moved from src/app/settings.tsx
    devices.tsx                  # Placeholder
    sms.tsx                      # Placeholder

components/
  dashboard/
    Header.tsx                   # Greeting + last-updated + profile
    HeroCard.tsx                 # Network type + signal bars + DL/UL
    StatRingCard.tsx             # Battery + data usage (reusable for both)
    DevicesCard.tsx              # Connected devices count
    QuickActions.tsx             # Wi-Fi toggle, Share (placeholder), Speed test (placeholder)
    SignalBars.tsx               # 4-bar signal indicator
    TabBar.tsx                   # Custom floating-pill tab bar
    PulsingDot.tsx               # Reanimated pulse for online status

src/hooks/HiLinkProvider.tsx     # Update import path: ../app/settings → ../app/(tabs)/settings
```

## Phases

### Phase 1 — Navigator scaffolding (no UI changes yet)
- [ ] 1.1: Move `src/app/settings.tsx` → `src/app/(tabs)/settings.tsx`
- [ ] 1.2: Update `HiLinkProvider` import path
- [ ] 1.3: Create `src/app/(tabs)/_layout.tsx` with `Tabs` + placeholder `tabBar`
- [ ] 1.4: Create `src/app/(tabs)/devices.tsx` placeholder
- [ ] 1.5: Create `src/app/(tabs)/sms.tsx` placeholder
- [ ] 1.6: Update `src/app/_layout.tsx` to render the new layout structure
- [ ] 1.7: Move existing `src/app/index.tsx` body into `src/app/(tabs)/index.tsx` (still showing raw JSON for now, but inside the tabs layout)
- [ ] 1.8: Typecheck and verify the app still launches

**Verification after Phase 1:** app launches, shows the existing JSON dump, all four tabs visible at the bottom, tapping each tab navigates, tapping Settings on the home tab still works for logout.

### Phase 2 — Bottom nav visual (TabBar.tsx)
- [ ] 2.1: Create `components/dashboard/TabBar.tsx` — floating pill with 4 items, active state with accent pill
- [ ] 2.2: Wire it into `src/app/(tabs)/_layout.tsx` as the `tabBar` prop
- [ ] 2.3: Typecheck

**Verification after Phase 2:** bottom nav looks like the mock (floating pill, accent active state, inactive items icon-only).

### Phase 3 — Header + Hero card
- [ ] 3.1: Create `components/dashboard/PulsingDot.tsx` — Reanimated pulse (opacity 1 → 0.3, 2s loop)
- [ ] 3.2: Create `components/dashboard/SignalBars.tsx` — 4 bars, opacity mapped to `SignalIcon` (0-5)
- [ ] 3.3: Create `components/dashboard/Header.tsx` — greeting + last-updated timestamp + profile button
- [ ] 3.4: Create `components/dashboard/HeroCard.tsx` — accent background, network type, signal bars, DL/UL, online dot
- [ ] 3.5: Wire Header + HeroCard into the home screen (`(tabs)/index.tsx`)

**Verification after Phase 3:** home screen shows the header and a real hero card with live data from `getStatus()` and `getTraffic()`. No mock values.

### Phase 4 — Stat rings (battery + data usage)
- [ ] 4.1: Create `components/dashboard/StatRingCard.tsx` — reusable wrapper around the existing `CircularProgress`
- [ ] 4.2: Add two StatRingCards to the home screen in a 2-column row (battery + data usage)

**Verification after Phase 4:** two ring cards side by side below the hero. Battery animates from 0 on mount. Data usage shows `TotalDownload` formatted as GB.

### Phase 5 — Devices card + Quick actions
- [ ] 5.1: Create `components/dashboard/DevicesCard.tsx` — count + chevron (no avatars yet, no list yet)
- [ ] 5.2: Create `components/dashboard/QuickActions.tsx` — Wi-Fi toggle (wired to `setMobileData`), Share + Speed test placeholders
- [ ] 5.3: Wire both into the home screen

**Verification after Phase 5:** home screen has all six content sections from the mock, minus the throughput chart and the avatar list.

### Phase 6 — Polish + cleanup
- [ ] 6.1: Remove `components/test.tsx` (its content has been replaced by the dashboard)
- [ ] 6.2: Update `PROJECT.md` change log
- [ ] 6.3: Remove the diagnostic `console.log` lines in `triggerLogin()` (deferred item, can clean up now)
- [ ] 6.4: Visual review on real device (dark mode, light mode, scroll behavior)

**Verification after Phase 6:** app looks like the mock at v1 fidelity. Auth still works. Logout still works.

## Deferred to a later phase (not in this batch)

- Live throughput SVG chart (needs separate 2-3s polling layer)
- Connected devices list with avatars (needs `/api/wlan/host-list` endpoint)
- "vs. yesterday" trend (needs local history layer)
- Cycle-aware data usage (needs cycle start date tracking)
- Carrier name (no API source)
- Speed test (no endpoint)
- Share/QR (no implementation)
- Real auth error handling on Settings (wrong password should stay on Settings, not bounce to test screen)
- Status bar theming (dark mode icons on light backgrounds)
