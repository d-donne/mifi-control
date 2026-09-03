# MiFi Dashboard

A custom Expo / React Native / TypeScript app to control a Huawei E5576-320 MiFi directly over local Wi-Fi, replacing the official "AI Life" app. The phone talks straight to the device at `http://192.168.8.1` over its local HiLink HTTP API — no backend server in between.

> **Note:** this is a learning project. contributions are intentionally minimal.

## Stack

- **Expo SDK 57** + TypeScript, React 19.2, React Native 0.86
- **Bun** for package management and script running (`bun.lock` present)
- **Gluestack UI** with the **Uniwind** adapter for styling
- **Expo Router** for file-based navigation
- **`fast-xml-parser`** + **`fast-xml-builder`** for the HiLink XML protocol
- **`expo-crypto`** for SHA256 password hashing
- **`@tanstack/react-query`** for all data fetching and polling

## Project status

Currently in early development. The HiLink client (`src/api/main.ts`) can authenticate, manage the session cookie and CSRF token pool, and exposes typed methods for `getStatus`, `getTraffic`, `getDeviceInfo`, `setMobileData`, and `reboot`. UI is a minimal proof-of-concept polling screen.

See [`PROJECT.md`](./PROJECT.md) for the full project tracker — current blockers, deferred features, and the ordered next-steps list.

## Running

```bash
bun install
bunx expo start
```

Then open with the iOS simulator, Android emulator, a development build, or Expo Go as prompted.

## Configuration

The MiFi device address and admin credentials are read from `.env`:

```
EXPO_PUBLIC_MODEM_URL="http://192.168.8.1"
EXPO_PUBLIC_USERNAME=admin
EXPO_PUBLIC_PASS=your-password
```

Only `EXPO_PUBLIC_`-prefixed variables are inlined into the runtime bundle by Expo. The `EXPO_PUBLIC_PASS` prefix is currently unavoidable — once the client is fully proven, credentials should move to `expo-secure-store` and a Settings screen (deferred — see `PROJECT.md`).

## Layout

```
src/
  api/            HiLink client, types, error handling, XML helpers
  app/            Expo Router screens (_layout.tsx, index.tsx)
  hooks/          React context providers
components/       Reusable UI (including Gluestack primitives under ui/)
```

## License

See [`LICENSE`](./LICENSE).
