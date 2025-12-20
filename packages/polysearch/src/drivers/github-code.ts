import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub Code Driver Options
export interface GitHubCodeDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token (required for code search)
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
  options: GitHubCodeDriverOptions = {},
): Driver {
  const { token } = options;

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
    options,

    search: async (
      searchOptions: GitHubCodeSearchOptions,
    ): Promise<SearchResponse> => {
      const { query, limit = 30, sort, order } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      // Code search requires authentication
      if (!token) {
        console.error("GitHub Code Search requires authentication token");
        return { results: [] };
      }

      try {
        // Build GitHub API query
        const apiQuery = buildQuery(query, searchOptions);
        const searchParams = new URLSearchParams({
          q: apiQuery,
          per_page: Math.min(limit, 100).toString(), // GitHub API limit is 100
        });

        // Add sort parameters if provided
        if (sort) {
          searchParams.set("sort", sort);
          if (order) {
            searchParams.set("order", order);
          }
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
          snippet: `Found in ${item.repository.full_name} - ${item.repository.description || "No description"}`,
        }));

        // Apply limit if needed
        const limitedResults = results.slice(0, limit);

        return {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            page: searchOptions.page || 1,
            perPage: searchOptions.perPage || 30,
          },
        };
      } catch (error) {
        console.error("GitHub Code Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error("GitHub API rate limit exceeded.");
        }

        // Handle authentication errors
        if (error instanceof Error && error.message.includes("401")) {
          console.error(
            "GitHub Code Search requires valid authentication token.",
          );
        }

        return { results: [] };
      }
    },

    // GitHub code search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
