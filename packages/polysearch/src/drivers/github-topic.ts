import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SearchOptions,
  SearchResponse,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// GitHub Topic Driver Options
export interface GitHubTopicDriverOptions extends DriverOptions {
  cache?: CacheConfig;
  token?: string; // GitHub Personal Access Token
}

// GitHub Topic Search Options - matches official API parameters
export interface GitHubTopicSearchOptions extends SearchOptions {
  per_page?: number; // Number of results per page (max 100)
  page?: number; // Page number for pagination (1-based)
}

// GitHub Topic API response types
export interface GitHubTopic {
  name: string;
  display_name: string;
  short_description: string;
  description: string;
  featured: boolean;
  curated: boolean;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubTopicSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubTopic[];
}

export default function githubTopicDriver(
  driverOptions: GitHubTopicDriverOptions = {},
): Driver {
  const { token } = driverOptions;
  const cache = createCache(driverOptions.cache);

  return {
    name: "github-topic",
    options: driverOptions,

    search: async (
      searchOptions: GitHubTopicSearchOptions,
    ): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      const limit =
        searchOptions.per_page || searchOptions.limit || cache.perPage || 30;
      const page = searchOptions.page || 1;
      const cacheKey = `github-topic:${query}:${page}:${limit}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        // Build GitHub API query
        const searchParams = new URLSearchParams({
          q: query,
          per_page: Math.min(limit, 100).toString(),
        });

        // Add page parameter if provided
        if (page && page > 1) {
          searchParams.set("page", page.toString());
        }

        // Build headers
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Make API request to topics endpoint
        const response: GitHubTopicSearchResponse = await ofetch(
          `https://api.github.com/search/topics?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((topic): any => ({
          title: topic.display_name,
          url: `https://github.com/topics/${topic.name}`,
          snippet:
            topic.description ||
            topic.short_description ||
            `Featured topic: ${topic.display_name}`,
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
        console.error("GitHub Topic Search Error:", error);
        return { results: [] };
      }
    },

    // GitHub topic search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
