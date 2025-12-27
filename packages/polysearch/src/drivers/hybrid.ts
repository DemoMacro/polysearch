import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// HybridDriver specific options
export interface HybridDriverOptions extends DriverOptions {
  drivers: Array<{
    driver: Driver;
    weight?: number; // Default 1.0
    timeout?: number; // Timeout in ms for this specific driver
  }>;
  cache?: CacheConfig;
}

// Weighted search result for internal processing
interface WeightedSearchResult {
  title: string;
  url: string;
  snippet?: string;
  weight: number;
  sources: string[]; // Array of driver names that returned this result
  rank: number; // Original rank in the driver's results (1-based)
}

// Normalize URL for deduplication by handling trailing slashes, www prefix, and tracking parameters
function normalizeUrl(url: string): string {
  try {
    let normalized = url.trim().toLowerCase();

    // Remove www. prefix
    if (normalized.startsWith("www.")) {
      normalized = normalized.substring(4);
    }

    // Remove trailing slash
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }

    // Remove common tracking parameters (UTM, Facebook Click ID, Google Click ID)
    const urlObj = new URL(normalized);
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return trimmed lowercase version
    return url.trim().toLowerCase();
  }
}

// Deduplicate results by URL, merging sources and keeping higher weighted results
function deduplicateResults(
  results: WeightedSearchResult[],
): WeightedSearchResult[] {
  const urlMap = new Map<string, WeightedSearchResult>();

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const existing = urlMap.get(normalizedUrl);

    if (!existing) {
      // First time seeing this URL
      urlMap.set(normalizedUrl, result);
    } else {
      // Merge sources from multiple drivers
      existing.sources = [...new Set([...existing.sources, ...result.sources])];

      // If new result has higher weight, take its content (title, snippet)
      if (result.weight > existing.weight) {
        existing.weight = result.weight;
        existing.title = result.title;
        existing.snippet = result.snippet;
        existing.rank = result.rank; // Take the better rank from higher weighted driver
      }
      // If same weight but better rank, update rank
      else if (
        result.weight === existing.weight &&
        result.rank < existing.rank
      ) {
        existing.rank = result.rank;
      }
    }
  }

  // Sort by weighted score: rank / weight (ascending), then by weight (descending)
  const finalResults = Array.from(urlMap.values()).sort((a, b) => {
    // Calculate weighted score (lower is better)
    const scoreA = a.rank / a.weight;
    const scoreB = b.rank / b.weight;

    if (scoreA !== scoreB) {
      return scoreA - scoreB; // Lower score comes first
    }

    // If scores are equal, higher weight comes first
    return b.weight - a.weight;
  });

  return finalResults;
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

export default function hybridDriver(options: HybridDriverOptions): Driver {
  const { drivers, cache: cacheConfig } = options;

  if (!drivers || drivers.length === 0) {
    throw new Error("HybridDriver requires at least one driver");
  }

  const cache = createCache(cacheConfig);

  // Normalize driver configurations
  const normalizedDrivers = drivers.map(
    ({ driver, weight = 1.0, timeout }) => ({
      driver,
      weight,
      timeout,
    }),
  );

  return {
    name: "hybrid",
    options,

    search: async (searchOptions: SearchOptions): Promise<SearchResponse> => {
      const { query, page = 1, perPage = 10 } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      // Dynamically fetch results from all drivers
      const targetCount = page * perPage;
      let driverPage = 1;
      const maxPages = 5; // Safety limit

      let allResults: WeightedSearchResult[] = [];

      // Collect totals from all drivers (only once per driver)
      const driverTotals = new Map<string, number>();

      while (allResults.length < targetCount && driverPage <= maxPages) {
        // Fetch current page from all drivers
        const driverPromises = normalizedDrivers.map(
          async ({ driver, weight, timeout }) => {
            const searchPromise = Promise.resolve(
              driver.search({ query, page: driverPage, perPage }),
            );
            const result = timeout
              ? await withTimeout(
                  searchPromise,
                  timeout,
                  `Driver ${driver.name} timed out after ${timeout}ms`,
                )
              : await searchPromise;

            // Collect total from this driver (only first time we see it)
            const driverName = driver.name || "unknown";
            if (!driverTotals.has(driverName)) {
              const driverTotal = result.totalResults;
              if (driverTotal !== undefined && driverTotal > 0) {
                driverTotals.set(driverName, driverTotal);
              }
            }

            return {
              driverName,
              weight,
              results: result.results || [],
            };
          },
        );

        const driverResults = await Promise.allSettled(driverPromises);

        // Process results from this page
        for (const promiseResult of driverResults) {
          if (promiseResult.status === "fulfilled") {
            const { driverName, weight, results } = promiseResult.value;

            const weightedResults: WeightedSearchResult[] = results.map(
              (result, index) => ({
                ...result,
                weight,
                sources: [driverName],
                rank: (driverPage - 1) * perPage + index + 1,
              }),
            );

            allResults.push(...weightedResults);
          }
        }

        // Deduplicate after each page
        allResults = deduplicateResults(allResults);

        // Stop if we have enough results
        if (allResults.length >= targetCount) {
          break;
        }

        driverPage++;
      }

      // Paginate from all results
      const offset = (page - 1) * perPage;
      const paginatedResults = allResults.slice(offset, offset + perPage);

      // Calculate total results (sum of all driver totals)
      const estimatedTotalResults = Array.from(driverTotals.values()).reduce(
        (sum, total) => sum + total,
        0,
      );

      return {
        results: paginatedResults,
        totalResults:
          estimatedTotalResults > 0 ? estimatedTotalResults : allResults.length,
        pagination: { page, perPage },
      };
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
          }
          // Silently ignore failed suggestions
        }

        return deduplicateSuggestions(allSuggestions);
      } catch {
        return [];
      }
    },
  };
}
