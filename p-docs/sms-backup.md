# SMS backup — research

_Research only, 2026-11-04. Nothing has been written to or deleted from the MiFi; no code exists yet._

Goal: keep every SMS forever, off the MiFi, so old messages can later be removed from the device without loss. The device holds 500 messages; when it's full, new SMS stop arriving.

Constraints set by the owner: local first, then cloud (Cloudflare or Google Drive); strongest encryption that costs no noticeable speed; a message leaves the device only once **both** the local and the cloud copy exist; no deletions until the design is agreed.

---

## Measured on the device (2026-11-04)

Read through the running app's own session (Metro CDP, see `PROJECT.md` → Running the app): `GET sms/sms-count`, `GET sms/config`, `POST sms-list` page 1 of boxes 3–9, and the cached `["sms","all"]` result. No second login, no writes.

| Fact                     | Value                                                                                                        | Consequence                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Capacity                 | `LocalMax 500`; `LocalInbox 476` + `LocalOutbox 8` = 484 used (97 %), after the owner deleted a batch        | Read `LocalMax` instead of hard-coding 500; usage = inbox + outbox + draft                   |
| Arrival rate             | 217 in Sep, 93 in Oct, 32 in Nov 1–4 (≈ 8/day now)                                                           | 16 free slots ≈ 2 days. The backup is urgent; cleanup must start at a threshold, not at full |
| Deletes are immediate    | `LocalDeleted 0` and box 4 (trash) empty after the owner's deletes                                           | `delete-sms` frees the slot; there's no trash step                                           |
| `Index` is a slot number | Indexes 40000–40497; the 16 gaps add up to exactly 500 − 484; the newest messages sit at 40306–40368         | `Index = 40000 + slot`; the lowest free slot is reused. **`Index` is not an identity**       |
| Same sender, same second | 13 pairs share `Phone` + `Date`; 4 of them (MobileMoney) also share identical content                        | Neither `(phone, date)` nor a content hash is unique                                         |
| Device key               | `Index + Date + Phone` unique across all 484                                                                 | Usable identity while the message is on the device                                           |
| Other boxes              | Drafts, trash, SIM inbox/sent/draft, mix boxes: all empty                                                    | Only boxes 1 and 2 need backing up                                                           |
| SIM                      | `SimMax 50`, `SimUsed 6`, but SIM boxes list nothing; `SaveMode 0` (store on device)                         | Six SIM slots are in use by something the API doesn't list. Open question                    |
| Size                     | ≈ 120 KB for 484 messages (longest text 468 chars)                                                           | A lifetime archive is a few MB; size never drives a design choice                            |
| Multipart                | 386 of 484 are multipart; none currently has empty content                                                   | Content can still change while a message is reassembling                                     |
| Clock                    | Received stamps carry the sending centre's zone (see `sms-research.md`); sent stamps the sending app's clock | Archive raw stamps (below)                                                                   |

---

## Record identity and contents

**Identity:** `id = HMAC-SHA256(idKey, box | Index | Date | Phone)`, hex.

- Unique on the device today. A reused slot gets a new `Date`, so it gets a new `id`.
- Opaque to the cloud: the server never sees numbers or times.
- The 4 identical MobileMoney pairs stay two records, as on the device.
- `contentHash = SHA-256(Content)` is stored alongside, to detect changes and to verify before any delete.

**Mutable while on the device:** `Content` (multipart fill-in), `Smstat` (read state, send status). Later fetches update the record. A message missing from a fetch **never** changes or removes its record: `fetchAllSms` returns partial results with `error` set.

**Fields to archive.** Raw facts, so derived values can be recomputed when the clock logic changes again (it has changed three times):

| Field                                              | Why                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `box`, `Index`, `Phone`, `Content`, `Date`         | The device's own data, `Date` raw (zone unknown)                                  |
| `SmsType`, `Smstat`, `Sca`, `SaveType`, `Priority` | Complete copy; `SmsType` marks delivery reports                                   |
| `firstSeenAt`                                      | Phone clock when the app first saw it: ground truth for the clock offset          |
| `seenLive`                                         | First seen by a poll < 90 s after the previous one (the `learnOffsets` condition) |
| `lastSeenOnDeviceAt`, `removedFromDeviceAt`        | Device presence; the second is only ever set by our own verified delete           |
| `contentHash`, `schema`                            | Verification; format version                                                      |

Not stored: the corrected `time`. It's derived at read time from `Date` + the learned offset. The learned offsets (`mifi.smsOffsets`, today only in SecureStore) get backed up as a separate small record.

Delivery reports are archived too. The MiFi drops some minutes after they arrive (`sms-research.md`), so the archive is the only lasting copy.

---

## Architecture: local first

```
MiFi ──fetch──▶ ingest ──▶ local DB (SQLCipher)  ──outbox──▶ cloud (ciphertext only)
                                   ▲                              │
                                   └──────── ack per id ──────────┘
```

- **Local DB is the source of truth** for history: `expo-sqlite` with `useSQLCipher`. Each fetch upserts in one transaction. The UI later reads from here and merges live device state (pending sends).
- **Outbox:** a column `cloudAckHash` (the `contentHash` the cloud confirmed). A row needs uploading when it's null or differs. Uploads retry on failure.
- **Why local first is required, not optional:** the phone reaches the cloud through the MiFi's own data. When the bundle runs out (exactly when top-up and MoMo messages arrive) or mobile data is off, only the local copy exists.
- **Background:** `expo-background-task` (Android WorkManager) runs no more often than every 15 min, only with network, and opportunistically; vendors may kill it. It needs the phone on the MiFi's Wi-Fi and must log in, which takes over the device's single session (web UI users get logged out). Treat it as a bonus; capture is guaranteed only while the app is open. Messages aren't lost while the app is closed; they just wait on the device, which is why the cleanup threshold has to leave about two weeks of headroom.
- **Side benefit:** with an archive, polls can stop paging once a full page is already known (date order per box), instead of re-reading about 10 pages per box. A full sweep still runs before any cleanup.

---

## Cloud: Cloudflare (recommended) vs Google Drive

| Need                                    | Cloudflare Worker + D1                                                                    | Google Drive                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Per-record ack (safe-delete rule)       | Idempotent `INSERT … ON CONFLICT` by `id`; the response lists stored `id` + `contentHash` | File store: acks per uploaded file; per-record state has to be rebuilt client-side                                                                     |
| Mutable records (multipart, read state) | Upsert                                                                                    | Append new files, merge on restore, compact periodically                                                                                               |
| Recovery from our own bugs              | D1 Time Travel: point-in-time restore, 7 days free                                        | Revisions per file; `appDataFolder` files can't be trashed                                                                                             |
| Auth                                    | Ours: bearer key derived from the passphrase; no SDK                                      | Google Sign-In + OAuth client per signing key (SHA-1); the free RN module uses Google's deprecated legacy Android SDK; manual token refresh on Android |
| Risk of the backup vanishing            | Only if the Cloudflare account is lost                                                    | `appDataFolder` is **deleted when the user disconnects the app** in Drive settings; `drive.file` files are visible and deletable by the user           |
| Cost at this volume                     | Free (100k requests/day, 100k rows written/day, 500 MB DB)                                | Free (counts toward the 15 GB account quota)                                                                                                           |
| Work to build                           | A small Worker (two endpoints) + `wrangler deploy`                                        | No server, but a sign-in flow, a file format and merge logic                                                                                           |

**Recommendation: Cloudflare Worker + D1.** The safe-delete rule needs a server that confirms each record by `id` and content hash. A database does that in one query; on Drive we'd have to rebuild it. Drive's hidden folder can also disappear with one click in Drive settings.

Drive can come later as an independent second copy: one encrypted snapshot file under `drive.file` (non-sensitive scope, basic verification only).

Worker surface (sketch):

- `PUT /records`: batch `{ id, v, blob }`. Upsert where `v` is newer. Returns `[{ id, contentHashTag }]`. The tag is an HMAC the client can check, so the hash isn't readable by the server.
- `GET /records?since=<cursor>`: for restore on a new phone.
- `GET/PUT /keyring`: the wrapped data key (below).
- Table: `id TEXT PRIMARY KEY, v INTEGER, blob BLOB, tag TEXT, updated_at INTEGER`.

Auth: `Authorization: Bearer <authKey>`; the Worker stores only `SHA-256(authKey)` as a secret and compares in constant time. Add rate limiting.

---

## Encryption

End to end: the cloud stores only ciphertext and opaque ids. Plain text exists only in memory on the phone.

**Keys** (envelope encryption: changing the passphrase doesn't re-encrypt anything):

```
passphrase ─Argon2id(salt)─▶ master (64 B)
                               ├─HKDF "kek"  ─▶ KEK  ── wraps ──┐
                               └─HKDF "auth" ─▶ authKey (Worker) │
random DEK (32 B) ◀── unwrapped by KEK ─────────────────────────┘
   ├─HKDF "record" ─▶ recordKey   AES-256-GCM per record
   ├─HKDF "id"     ─▶ idKey       HMAC record ids / tags
   └─HKDF "db"     ─▶ dbKey       SQLCipher raw key
```

- **Argon2id** (memory-hard, PHC winner): start at 64 MiB, 3 passes, parallelism 4. Tune so it takes about 1 s on the phone. It runs **only** at setup, passphrase change and restore on a new phone, never on launch.
- **Daily use:** the DEK is cached in SecureStore (Keystore-backed), so opening the app costs nothing. SecureStore is wiped on uninstall and Expo's docs say not to treat it as the only copy of critical data. The wrapped DEK is therefore stored in the cloud (`/keyring`) and the passphrase recovers it. Losing the passphrase **and** the phone loses the backup, by design. Write the passphrase down.
- **Records:** AES-256-GCM, random 96-bit nonce per encryption, 128-bit tag. The 2³²-encryptions-per-key limit is far beyond this volume.
  - AAD = `id | v | schema`, so a blob can't be moved to another record or have its version changed. A server serving an old version consistently isn't detected; restore takes the highest `v` it sees, and the local DB stays authoritative.
  - Plaintext = JSON of the fields above, padded to a 256-byte bucket so ciphertext length doesn't reveal message length.
- **Local DB:** SQLCipher with `PRAGMA key = "x'<64 hex>'"` (a raw key skips SQLCipher's own per-open PBKDF2). Check `PRAGMA cipher_version` right after opening and **refuse to write** if it returns nothing: without SQLCipher in the binary (Expo Go, forgotten rebuild), `PRAGMA key` is silently ignored and the DB is written in plain text. Android Auto Backup then only ever copies ciphertext.
- **Speed:** AES-GCM is native (`expo-crypto` `aesEncryptAsync`; ARMv8 has AES instructions), microseconds per SMS. SQLCipher overhead is negligible at thousands of rows. The only slow step is Argon2id, done once.
- **Libraries:**
  - `expo-crypto` (installed): AES-256-GCM (`AESEncryptionKey`, `aesEncryptAsync` / `aesDecryptAsync`, `AESSealedData`) and SHA-256. It has **no HMAC, HKDF or password KDF**. Also, its docs say `getRandomBytes` falls back to `Math.random` in development, so don't use it for keys, salts or nonces. Use `AESEncryptionKey.generate()` and let `aesEncryptAsync` generate nonces.
  - `react-native-quick-crypto` (Margelo, native, New Architecture, needs a dev build): Argon2id (async `argon2`), HKDF, HMAC, secure random bytes. It's needed anyway for Argon2id; using it for everything except AES would be fine too.
  - Why not XChaCha20-Poly1305: no gain over hardware AES-GCM with random nonces at this volume, and it isn't in `expo-crypto`.
- **What still leaks to Cloudflare:** upload times, record count, padded sizes, and which records change. Not numbers, senders, text or SMS times.

---

## Safe-delete rule (for the future cleanup phase; nothing deletes yet)

A message may be removed from the MiFi only when **all** hold:

1. The local row is committed and its `contentHash` matches the latest device copy.
2. The cloud acknowledged that `id` with that `contentHash` (`cloudAckHash` equals `contentHash`).
3. It isn't a multipart message with empty content, and it isn't pending or unread.
4. A fresh device read just before the delete shows the same `id` at that `Index`. Slots are reused and `delete-sms` takes only an `Index`, so this check is the only guard against deleting a new message that took the slot.
5. Deletes run in the SMS write scope (`SMS_WRITE_SCOPE`), never alongside a fetch: the device keeps one session.
6. After deleting, the next full fetch must not show that `id`. Only then set `removedFromDeviceAt`.

Policy numbers (from the measured rate): start cleanup at about 400 used and remove the oldest eligible messages down to about 300. That gives 100+ free slots, about 2 weeks at the current rate. Keep the newest few per conversation on the device so the web UI still shows context. Manual ("Free up space", with a preview) before any automatic run.

---

## Open questions (verify before building)

- **What happens when the store is full?** Normally the modem refuses and the SMS centre retries until the message expires. Unknown for MTN here; not worth testing (it means losing messages).
- **`SimUsed 6` with empty SIM boxes.** The SIM may hold six old messages the API doesn't list. A phone with the SIM inserted could show them. Only matters if they're wanted.
- **The 4 identical MobileMoney pairs:** real double sends or a MiFi storage quirk? Either way they're kept as two records.
- **Hermes performance** of `react-native-quick-crypto` Argon2id at 64 MiB on the owner's phone: measure, then tune.
- **`react-native-quick-crypto` on SDK 58 / RN 0.88:** confirm against its release notes before installing (needs a dev client rebuild).
- **Background task and the foreground client:** the task must reuse the live `HiLinkClient` when the app is running, or two logins will knock each other out.

---

## Proposed phases (one commit each, after owner review)

1. **Local archive:** SQLCipher DB, key setup (passphrase, Argon2id, DEK in SecureStore), ingest from every fetch. The UI is unchanged. Check: archive count = `LocalInbox + LocalOutbox`.
2. **Cloudflare Worker + D1** and the outbox: upload, ack, restore on a fresh install.
3. **UI reads the archive**, merging live device state. Old messages stay visible after they leave the device.
4. **Storage card:** used / `LocalMax`, backed-up count, eligible-to-remove count. Read only.
5. **Manual "Free up space"** under the safe-delete rule.
6. **Background task** and automatic cleanup at the threshold, only after phase 5 has run cleanly.

---

## Sources

- Expo SDK 58: [expo-sqlite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/) (`useSQLCipher`, `PRAGMA key`, `cipher_version`), [expo-crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/) (AES-GCM API), [expo-secure-store](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) (uninstall, Auto Backup, "not a single source of truth"), [expo-background-task](https://docs.expo.dev/versions/v58.0.0/sdk/background-task/) (WorkManager, 15 min).
- Cloudflare: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) (500 MB free, Time Travel 7 days).
- Google: [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) (`drive.appdata`, `drive.file` non-sensitive), [appDataFolder](https://developers.google.com/workspace/drive/api/guides/appdata) (hidden, deleted when the app is disconnected), [react-native-google-signin Original](https://react-native-google-signin.github.io/docs/original) (legacy Android SDK, manual token refresh).
- [react-native-quick-crypto Argon2](https://crypto.margelo.com/docs/api/argon2).
