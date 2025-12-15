import type { PolySearchOptions, SuggestionOptions } from "./types";

export function createPolySearch(options: PolySearchOptions) {
  const driver = options.driver;

  // Core search operations
  const search = {
    search: driver.search,

    suggest:
      driver.suggest ||
      (async (_options: SuggestionOptions): Promise<string[]> => {
        // Fallback: return empty array if suggest not implemented
        return [];
      }),
  };

  return search;
}
