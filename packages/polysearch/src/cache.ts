import { createStorage } from "unstorage";
import lruDriver from "unstorage/drivers/lru-cache";
import type { CacheOptions, CacheConfig, SearchResponse } from "./types";

// Cache manager for drivers
export function createCache(cacheConfig?: CacheConfig) {
  if (cacheConfig === false) {
    // Cache disabled
    return {
      perPage: undefined,
      ttl: 60,

      async get(): Promise<SearchResponse | null> {
        return null;
      },

      async set(): Promise<void> {
        // No-op when cache disabled
      },
    };
  }

  const perPage = cacheConfig?.perPage;
  const ttl = cacheConfig?.ttl ?? 60;

  // Always create storage (defaults to LRU cache)
  const storage =
    cacheConfig?.storage ||
    createStorage({
      driver: lruDriver({
        max: cacheConfig?.maxItems || 100,
      }),
    });

  return {
    perPage,
    ttl,

    async get(key: string): Promise<SearchResponse | null> {
      const value = await storage.get<SearchResponse>(key);
      if (!value) return null;

      const meta = await storage.getMeta(key);
      if (meta?.mtime && typeof meta.mtime.getTime === "function") {
        const age = (Date.now() - meta.mtime.getTime()) / 1000;
        if (age > ttl) {
          await storage.removeItem(key);
          return null;
        }
      } else {
        await storage.removeItem(key);
        return null;
      }

      return value;
    },

    async set(key: string, value: SearchResponse): Promise<void> {
      await storage.set(key, value, { ttl });
    },
  };
}
