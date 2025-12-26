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
      return await storage.get<SearchResponse>(key);
    },

    async set(key: string, value: SearchResponse): Promise<void> {
      await storage.set(key, value, { ttl });
    },
  };
}
