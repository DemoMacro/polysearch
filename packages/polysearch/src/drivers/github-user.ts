import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub User Driver Options
export interface GitHubUserDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token
}

// GitHub User Search Options - matches official API parameters
export interface GitHubUserSearchOptions extends SearchOptions {
  sort?: "followers" | "repositories" | "joined";
  order?: "asc" | "desc";
}

// GitHub User API response types
export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubUserSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubUser[];
}

export default function githubUserDriver(
  options: GitHubUserDriverOptions = {},
): Driver {
  const { token } = options;

  // Helper function to build query string with qualifiers
  function buildQuery(
    query: string,
    searchOptions: GitHubUserSearchOptions,
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
    name: "github-user",
    options,

    search: async (
      searchOptions: GitHubUserSearchOptions,
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
        const response: GitHubUserSearchResponse = await ofetch(
          `https://api.github.com/search/users?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((user): any => ({
          title: user.login,
          url: user.html_url,
          snippet:
            user.bio ||
            `${user.name || user.login} - ${user.type} with ${user.public_repos} public repositories`,
        }));

        // Apply limit if needed
        const limitedResults = results.slice(0, limit);

        return {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            incomplete_results: response.incomplete_results,
          },
        };
      } catch (error) {
        console.error("GitHub User Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error(
            "GitHub API rate limit exceeded. Consider using a token.",
          );
        }

        return { results: [] };
      }
    },

    // GitHub user search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
