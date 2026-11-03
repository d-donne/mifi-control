import {
  HiLinkError,
  isLoginRejection,
  LOGIN_LOCKOUT_CODES,
  LOGIN_PASSWORD_CHANGE_CODES,
  NETWORK_ERROR_CODE,
} from "@/src/api/errors";
import { HiLinkClient } from "@/src/api/main";
import { getDevice } from "@/src/api/routes";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEYS = {
  baseUrl: "mifi.baseUrl",
  username: "mifi.username",
  password: "mifi.password",
  deviceName: "mifi.deviceName",
} as const;

/** Longest the splash screen waits on the startup reconnect. */
const RESTORE_SPLASH_MAX_MS = 4_000;

export interface StoredCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

export interface SessionError {
  /**
   * credentials: wrong username/password (shown on the form).
   * blocked: lockout or forced password change — retrying won't help.
   */
  kind: "credentials" | "blocked" | "network" | "other";
  message: string;
}

export type SessionStatus =
  | "hydrating"
  | "signedOut"
  | "connecting"
  | "connected";

interface SessionState {
  status: SessionStatus;
  /** True while the startup reconnect runs; keeps the splash screen up. */
  restoring: boolean;
  /** Last credentials that logged in successfully (persisted). */
  credentials: StoredCredentials | null;
  /** Last credentials attempted; pre-fills the sign-in form after a failure. */
  draft: StoredCredentials | null;
  client: HiLinkClient | null;
  error: SessionError | null;
  /** Model name from the last connected device, e.g. "E5576-320". */
  deviceName: string | null;
  signIn: (creds: StoredCredentials) => Promise<boolean>;
  retry: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

async function readCredentials(): Promise<StoredCredentials | null> {
  const [baseUrl, username, password] = await Promise.all([
    SecureStore.getItemAsync(KEYS.baseUrl),
    SecureStore.getItemAsync(KEYS.username),
    SecureStore.getItemAsync(KEYS.password),
  ]);
  return baseUrl && username && password
    ? { baseUrl, username, password }
    : null;
}

async function writeCredentials(creds: StoredCredentials): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.baseUrl, creds.baseUrl),
    SecureStore.setItemAsync(KEYS.username, creds.username),
    SecureStore.setItemAsync(KEYS.password, creds.password),
  ]);
}

async function deleteCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.baseUrl),
    SecureStore.deleteItemAsync(KEYS.username),
    SecureStore.deleteItemAsync(KEYS.password),
  ]);
}

export function sameCredentials(
  a: StoredCredentials | null,
  b: StoredCredentials | null,
): boolean {
  return (
    a !== null &&
    b !== null &&
    a.baseUrl === b.baseUrl &&
    a.username === b.username &&
    a.password === b.password
  );
}

function hostOf(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function toSessionError(e: unknown, baseUrl: string): SessionError {
  const code = e instanceof HiLinkError ? String(e.code) : "";
  if (LOGIN_LOCKOUT_CODES.has(code)) {
    return {
      kind: "blocked",
      message:
        "Too many failed sign-in attempts. The MiFi is blocking sign-in — wait a few minutes before trying again.",
    };
  }
  if (LOGIN_PASSWORD_CHANGE_CODES.has(code)) {
    return {
      kind: "blocked",
      message:
        "The MiFi wants its admin password changed before it allows sign-in. Change it on the device's web page, then sign in with the new password.",
    };
  }
  if (isLoginRejection(e)) {
    return {
      kind: "credentials",
      message:
        code === "108001"
          ? "Unknown username."
          : code === "108002"
            ? "Wrong password."
            : "Wrong username or password.",
    };
  }
  if (code === NETWORK_ERROR_CODE) {
    return {
      kind: "network",
      message: `Can't reach the MiFi at ${hostOf(baseUrl)}. Make sure this phone is connected to its Wi-Fi.`,
    };
  }
  return {
    kind: "other",
    message: e instanceof Error ? e.message : String(e),
  };
}

async function rememberDeviceName(client: HiLinkClient): Promise<void> {
  const { DeviceName } = await getDevice(client, "information");
  if (!DeviceName || DeviceName === useSession.getState().deviceName) return;
  useSession.setState({ deviceName: DeviceName });
  await SecureStore.setItemAsync(KEYS.deviceName, DeviceName);
}

/** Increments on every sign-in/out so a slow, superseded attempt is ignored. */
let generation = 0;

export const useSession = create<SessionState>()((set, get) => ({
  status: "hydrating",
  restoring: false,
  credentials: null,
  draft: null,
  client: null,
  error: null,
  deviceName: null,

  /**
   * One login attempt with `creds`; persists them only if the device
   * accepts them. The previous client is closed first: the device keeps a
   * single session, and a still-polling old client would re-login with
   * its old password and count toward the lockout.
   */
  signIn: async (creds) => {
    const id = ++generation;
    get().client?.close();
    set({ status: "connecting", draft: creds, client: null, error: null });

    let client: HiLinkClient;
    try {
      client = await HiLinkClient.connect(
        creds.baseUrl,
        creds.username,
        creds.password,
      );
    } catch (e) {
      if (id !== generation) return false;
      set({ status: "signedOut", error: toSessionError(e, creds.baseUrl) });
      return false;
    }

    if (id !== generation) {
      client.close();
      return false;
    }
    if (!sameCredentials(get().credentials, creds)) {
      await writeCredentials(creds).catch(() => undefined);
    }
    client.onLoginRejected((e) => {
      if (get().client !== client) return;
      client.close();
      set({
        status: "signedOut",
        client: null,
        draft: get().credentials,
        error: toSessionError(e, creds.baseUrl),
      });
    });
    set({ status: "connected", client, credentials: creds, draft: null });
    rememberDeviceName(client).catch(() => undefined);
    return true;
  },

  retry: async () => {
    const creds = get().draft ?? get().credentials;
    return creds ? get().signIn(creds) : false;
  },

  signOut: async () => {
    ++generation;
    const { client } = get();
    set({
      status: "signedOut",
      client: null,
      credentials: null,
      draft: null,
      error: null,
    });
    void client?.logout();
    await deleteCredentials().catch(() => undefined);
  },
}));

async function hydrate(): Promise<void> {
  const [creds, deviceName] = await Promise.all([
    readCredentials().catch(() => null),
    SecureStore.getItemAsync(KEYS.deviceName).catch(() => null),
  ]);
  if (!creds) {
    useSession.setState({ status: "signedOut", deviceName });
    return;
  }
  useSession.setState({ credentials: creds, deviceName, restoring: true });
  const giveUp = setTimeout(
    () => useSession.setState({ restoring: false }),
    RESTORE_SPLASH_MAX_MS,
  );
  await useSession.getState().signIn(creds);
  clearTimeout(giveUp);
  useSession.setState({ restoring: false });
}

void hydrate();
