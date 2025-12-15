import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
  SearchResult,
} from "..";

// MetaDriver specific options
export interface MetaDriverOptions extends DriverOptions {
  drivers: Array<{
    driver: Driver;
    weight?: number; // Default 1.0
    timeout?: number; // Timeout in ms for this specific driver
  }>;
}

// Weighted search result for internal processing
interface WeightedSearchResult {
  title: string;
  url: string;
  snippet?: string;
  weight: number;
}

// Helper function to deduplicate results by URL, keeping higher weighted results
function deduplicateResults(results: WeightedSearchResult[]): SearchResult[] {
  const urlMap = new Map<string, WeightedSearchResult>();

  for (const result of results) {
    const existing = urlMap.get(result.url);

    if (!existing || result.weight > existing.weight) {
      urlMap.set(result.url, result);
    }
  }

  // Sort by weight (descending) and convert to SearchResult format
  return Array.from(urlMap.values())
    .sort((a, b) => b.weight - a.weight)
    .map(({ title, url, snippet }) => ({
      title,
      url,
      snippet,
    }));
}

// Helper function to deduplicate suggestions
function deduplicateSuggestions(suggestions: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const suggestion of suggestions) {
    const normalized = suggestion.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(suggestion);
    }
  }

  return unique;
}

// Helper function to create timeout wrapper
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export default function metaDriver(options: MetaDriverOptions): Driver {
  const { drivers } = options;

  if (!drivers || drivers.length === 0) {
    throw new Error("MetaDriver requires at least one driver");
  }

  // Normalize driver configurations
  const normalizedDrivers = drivers.map(
    ({ driver, weight = 1.0, timeout }) => ({
      driver,
      weight,
      timeout,
    }),
  );

  return {
    name: "meta",
    options,

    search: async (searchOptions: SearchOptions): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      try {
        // Execute all drivers in parallel with optional timeouts
        const driverPromises = normalizedDrivers.map(
          async ({ driver, weight, timeout }) => {
            const searchPromise = Promise.resolve(driver.search(searchOptions));
            const result = timeout
              ? await withTimeout(
                  searchPromise,
                  timeout,
                  `Driver ${driver.name} timed out after ${timeout}ms`,
                )
              : await searchPromise;

            return {
              weight,
              results: result.results || [],
            };
          },
        );

        // Wait for all drivers to complete
        const driverResults = await Promise.allSettled(driverPromises);

        // Process successful results
        const successfulResults: WeightedSearchResult[] = [];

        for (const promiseResult of driverResults) {
          if (promiseResult.status === "fulfilled") {
            const { weight, results } = promiseResult.value;

            // Add weight information to each result
            const weightedResults: WeightedSearchResult[] = results.map(
              (result) => ({
                ...result,
                weight,
              }),
            );

            successfulResults.push(...weightedResults);
          } else {
            console.error("MetaDriver search error:", promiseResult.reason);
            // Continue with other drivers even if one fails
          }
        }

        // Apply limit if specified
        let finalResults = deduplicateResults(successfulResults);
        if (searchOptions.limit && searchOptions.limit > 0) {
          finalResults = finalResults.slice(0, searchOptions.limit);
        }

        return {
          results: finalResults,
          totalResults: successfulResults.length,
        };
      } catch (error) {
        console.error("MetaDriver search error:", error);
        return { results: [] };
      }
    },

    suggest: async (suggestOptions: SuggestionOptions): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      try {
        // Execute all drivers that support suggestions
        const driverPromises = normalizedDrivers.map(
          async ({ driver, timeout }) => {
            if (!driver.suggest) {
              return [];
            }

            const suggestPromise = Promise.resolve(
              driver.suggest(suggestOptions),
            );
            return timeout
              ? await withTimeout(
                  suggestPromise,
                  timeout,
                  `Driver ${driver.name} suggest timed out after ${timeout}ms`,
                )
              : await suggestPromise;
          },
        );

        // Wait for all suggestions
        const suggestionResults = await Promise.allSettled(driverPromises);

        // Collect all successful suggestions
        const allSuggestions: string[] = [];
        for (const result of suggestionResults) {
          if (result.status === "fulfilled" && Array.isArray(result.value)) {
            allSuggestions.push(...result.value);
          } else if (result.status === "rejected") {
            console.error("MetaDriver suggest error:", result.reason);
            // Continue with other drivers
          }
        }

        return deduplicateSuggestions(allSuggestions);
      } catch (error) {
        console.error("MetaDriver suggest error:", error);
        return [];
      }
    },
  };
}
