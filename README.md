# MiFi Dashboard

Expo + TypeScript app that controls a Huawei MiFi (E5576-320) over local Wi-Fi through its HiLink HTTP API. No backend — the phone talks to the device at `http://192.168.8.1` directly.

## Run

A development build is required (native modules such as `react-native-pager-view` aren't in Expo Go).

```bash
bun install
bun run android      # build + install the dev client (needed after native dependency changes)
bunx expo start      # start Metro for an installed dev client
```

## Checks

```bash
bun run lint         # oxlint (type-aware, includes type checking)
bun run fmt:check    # oxfmt
bunx tsc --noEmit    # TypeScript 7
```

## Docs

- [`PROJECT.md`](./PROJECT.md) — tracker: where to resume, how we work, architecture, device facts, next steps, change log.
- [`p-docs/`](./p-docs/) — research notes:
  - `webui-endpoints.md` — captured device API responses
  - `auth.md`, `sms-research.md`, `dashboard.md` — feature notes and status
  - `salamek-reference.md` — protocol reference from `Salamek/huawei-lte-api`

## License

See [`LICENSE`](./LICENSE).
