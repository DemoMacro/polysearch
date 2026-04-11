import type { PolySearchOptions, SuggestionOptions } from "./types";

export function createPolySearch(options: PolySearchOptions) {
  const driver = options.driver;

  const search = {
    search: driver.search,

    suggest:
      driver.suggest ||
      (async (_options: SuggestionOptions): Promise<string[]> => {
        return [];
      }),
  };

  return search;
}
