import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SearchOptions,
  SearchResponse,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// GitHub Code Driver Options
export interface GitHubCodeDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token (required for code search)
  cache?: CacheConfig;
}

// GitHub Code Search Options - matches official API parameters
export interface GitHubCodeSearchOptions extends SearchOptions {
  sort?: "indexed" | "updated";
  order?: "asc" | "desc";
}

// GitHub Code API response types
export interface GitHubCodeItem {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    forks_count: number;
    default_branch: string;
    open_issues_count: number;
    topics: string[];
  };
  score: number;
}

export interface GitHubCodeSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubCodeItem[];
}

export default function githubCodeDriver(
  driverOptions: GitHubCodeDriverOptions = {},
): Driver {
  const { token } = driverOptions;
  const cache = createCache(driverOptions.cache);

  // Helper function to build query string with qualifiers
  function buildQuery(
    query: string,
    searchOptions: GitHubCodeSearchOptions,
  ): string {
    const qualifiers: string[] = [];

    // Extract qualifiers from query if present
    const parts = query.split(/\s+/);
    const cleanQuery = parts.filter((part) => !part.includes(":")).join(" ");

    // Add qualifiers that were in the original query
    const qualifierParts = parts.filter((part) => part.includes(":"));
    qualifiers.push(...qualifierParts);

    // Add qualifiers from searchOptions that aren't already in query
    Object.entries(searchOptions).forEach(([key, value]) => {
      if (
        value !== undefined &&
        !qualifierParts.some((p) => p.startsWith(`${key}:`))
      ) {
        // Only add non-core API parameters as qualifiers
        if (
          key !== "query" &&
          key !== "limit" &&
          key !== "sort" &&
          key !== "order"
        ) {
          qualifiers.push(`${key}:${value}`);
        }
      }
    });

    const qualifiersStr =
      qualifiers.length > 0 ? ` ${qualifiers.join(" ")}` : "";
    return `${cleanQuery}${qualifiersStr}`;
  }

  return {
    name: "github-code",
    options: driverOptions,

    search: async (
      searchOptions: GitHubCodeSearchOptions,
    ): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      // Code search requires authentication
      if (!token) {
        console.error("GitHub Code Search requires authentication token");
        return { results: [] };
      }

      const limit = searchOptions.limit || cache.perPage || 30;
      const page = searchOptions.page || 1;
      const cacheKey = `github-code:${query}:${page}:${limit}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        // Build GitHub API query
        const apiQuery = buildQuery(query, searchOptions);
        const searchParams = new URLSearchParams({
          q: apiQuery,
          per_page: Math.min(limit, 100).toString(), // GitHub API limit is 100
        });

        // Add sort parameters if provided
        if (searchOptions.sort) {
          searchParams.set("sort", searchOptions.sort);
          if (searchOptions.order) {
            searchParams.set("order", searchOptions.order);
          }
        }

        // Add page parameter if provided
        if (page && page > 1) {
          searchParams.set("page", page.toString());
        }

        // Build headers
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${token}`,
        };

        // Make API request
        const response: GitHubCodeSearchResponse = await ofetch(
          `https://api.github.com/search/code?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((item): any => ({
          title: `${item.repository.full_name}/${item.path}`,
          url: item.html_url,
          snippet: item.path,
        }));

        // Apply limit if needed
        const limitedResults = results.slice(0, limit);

        const result: SearchResponse = {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            page: page,
            perPage: limit,
          },
        };

        // Cache the result
        await cache.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error("GitHub Code Search Error:", error);
        return { results: [] };
      }
    },

    // GitHub code search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
