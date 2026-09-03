// src/hooks/useStoredCredentials.ts
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

const MIFI_URL_KEY = "mifi.baseUrl";
const MIFI_USERNAME_KEY = "mifi.username";
const MIFI_PASSWORD_KEY = "mifi.password";

export interface StoredCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

interface UseStoredCredentials {
  credentials: StoredCredentials | null;
  isLoading: boolean;
  save: (creds: StoredCredentials) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * custom hook to manage stored credentials for the MiFi device.
 * It retrieves, saves, and clears credentials from secure storage.
 */
export function useStoredCredentials(): UseStoredCredentials {
  const [credentials, setCredentials] = useState<StoredCredentials | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [baseUrl, username, password] = await Promise.all([
        SecureStore.getItemAsync(MIFI_URL_KEY),
        SecureStore.getItemAsync(MIFI_USERNAME_KEY),
        SecureStore.getItemAsync(MIFI_PASSWORD_KEY),
      ]);
      if (cancelled) return;
      if (baseUrl && username && password) {
        setCredentials({ baseUrl, username, password });
      } else {
        setCredentials(null);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saves the provided credentials to secure storage and updates the state.
  async function save(creds: StoredCredentials): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(MIFI_URL_KEY, creds.baseUrl),
      SecureStore.setItemAsync(MIFI_USERNAME_KEY, creds.username),
      SecureStore.setItemAsync(MIFI_PASSWORD_KEY, creds.password),
    ]);
    setCredentials(creds);
  }

  // Clears the stored credentials from secure storage and resets the state.
  async function clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(MIFI_URL_KEY),
      SecureStore.deleteItemAsync(MIFI_USERNAME_KEY),
      SecureStore.deleteItemAsync(MIFI_PASSWORD_KEY),
    ]);
    setCredentials(null);
  }

  return { credentials, isLoading, save, clear };
}
