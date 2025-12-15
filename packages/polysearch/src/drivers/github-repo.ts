import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub Driver Options
export interface GitHubRepoDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token
}

// GitHub Repository Search Options - matches official API parameters
export interface GitHubRepoSearchOptions extends SearchOptions {
  sort?: "stars" | "forks" | "updated" | "created";
  order?: "asc" | "desc";
}

// GitHub API response types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  stargazers_count: number;
  watchers_count: number;
  language: string;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  owner: {
    login: string;
    id: number;
    type: string;
  };
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export default function githubRepoDriver(
  options: GitHubRepoDriverOptions = {},
): Driver {
  const { token } = options;

  // Helper function to build query string with qualifiers
  function buildQuery(
    query: string,
    searchOptions: GitHubRepoSearchOptions,
  ): string {
    const qualifiers: string[] = [];

    // Extract qualifiers from query if present (e.g., "language:typescript react")
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
    name: "github-repo",
    options,

    search: async (
      searchOptions: GitHubRepoSearchOptions,
    ): Promise<SearchResponse> => {
      const { query, limit = 30, sort, order } = searchOptions;

      if (!query.trim()) {
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
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Make API request
        const response: GitHubSearchResponse = await ofetch(
          `https://api.github.com/search/repositories?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((repo): any => ({
          title: repo.full_name,
          url: repo.html_url,
          snippet: repo.description,
        }));

        // Apply limit if needed (in case GitHub returns more than requested)
        const limitedResults = results.slice(0, limit);

        return {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            incomplete_results: response.incomplete_results,
          },
        };
      } catch (error) {
        console.error("GitHub Repository Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error(
            "GitHub API rate limit exceeded. Consider using a token.",
          );
        }

        return { results: [] };
      }
    },

    // GitHub repository search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
