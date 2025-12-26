import { createPolySearch } from "polysearch";
import hybridDriver from "polysearch/drivers/hybrid";
import googleCSEDriver from "polysearch/drivers/google-cse";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";
import type { Driver } from "polysearch";

// Search engine configuration type
export interface SearchEngineConfig {
  googleCSE: {
    enabled: boolean;
    cx: string; // Google Custom Search Engine ID
  };
  duckduckgo: {
    enabled: boolean;
  };
}

// Default configuration
export const defaultSearchConfig: SearchEngineConfig = {
  googleCSE: {
    enabled: false,
    cx: "",
  },
  duckduckgo: {
    enabled: true,
  },
};

/**
 * Create hybrid driver instance
 * @param config Search engine configuration
 * @returns Driver instance
 */
export function createHybridDriver(config: SearchEngineConfig): Driver {
  const drivers: Array<{
    driver: Driver;
    weight?: number;
    timeout?: number;
  }> = [];

  // Add Google CSE driver
  if (config.googleCSE.enabled && config.googleCSE.cx) {
    drivers.push({
      driver: googleCSEDriver({
        cx: config.googleCSE.cx,
      }),
      weight: 1.0,
      timeout: 5000,
    });
  }

  // Add DuckDuckGo driver
  if (config.duckduckgo.enabled) {
    drivers.push({
      driver: duckduckgoDriver(),
      weight: 0.5,
    });
  }

  // If no engines enabled, default to DuckDuckGo
  if (drivers.length === 0) {
    drivers.push({
      driver: duckduckgoDriver(),
      weight: 1.0,
    });
  }

  return hybridDriver({
    drivers,
  });
}

/**
 * Create search manager
 * @param config Search engine configuration
 * @returns Search manager instance
 */
export function createSearchManager(config: SearchEngineConfig) {
  const driver = createHybridDriver(config);
  return createPolySearch({
    driver,
  });
}
