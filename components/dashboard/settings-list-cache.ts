const DEFAULT_TTL_MS = 60_000;

type CacheEntry<T> = {
  data: T;
  at: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export const SETTINGS_USERS_CACHE_KEY = "settings:users";
export const SETTINGS_ROLES_CACHE_KEY = "settings:roles";
export const SETTINGS_AUDIT_CACHE_KEY = "settings:audit";

export function readSettingsCache<T>(
  key: string,
  ttlMs = DEFAULT_TTL_MS
): { data: T; fresh: boolean } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return {
    data: entry.data,
    fresh: Date.now() - entry.at <= ttlMs,
  };
}

export function writeSettingsCache<T>(key: string, data: T) {
  store.set(key, { data, at: Date.now() });
}

export function invalidateSettingsCache(...keys: string[]) {
  for (const key of keys) {
    store.delete(key);
  }
}
