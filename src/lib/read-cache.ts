interface Entry {
  value: unknown;
  expiresAt: number;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * The handful of reads every visitor needs are shared between requests, so a
 * warm instance answers from memory instead of paying an Atlas round trip per
 * page view. Admin writes call `invalidateReads`, so an edit is live at once
 * and the TTL is only the backstop for changes made outside this process.
 */
export async function readThrough<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const loading = load().then((value) => {
    entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
  inflight.set(key, loading);
  try {
    return await loading;
  } catch (error) {
    entries.delete(key);
    throw error;
  } finally {
    if (inflight.get(key) === loading) inflight.delete(key);
  }
}

/** Drops cached reads, optionally only those under a `prefix:child` namespace. */
export function invalidateReads(prefix?: string): void {
  for (const key of [...entries.keys()]) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key);
  }
}

/**
 * Stores a value the caller has just written, so the instance that handled the
 * save answers the next request without reading the database again. Other
 * instances stay correct through `invalidateReads` plus the TTL.
 */
export function primeRead<T>(key: string, ttlMs: number, value: T): T {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** True when a warm, unexpired value is already held under `key`. */
export function readCacheHas(key: string): boolean {
  const hit = entries.get(key);
  return Boolean(hit && hit.expiresAt > Date.now());
}

export const READ_TTL = {
  /**
   * Settings, page copy and the catalogue: written by the admin, rarely by hand.
   * The workspace invalidates its own instance on save, so this window is only
   * how long the *other* warm instances take to notice an edit made elsewhere.
   */
  content: 120_000,
  /** Google data refreshes daily, so a longer window costs nothing. */
  reviews: 10 * 60_000,
} as const;
