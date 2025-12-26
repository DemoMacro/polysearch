import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SearchOptions,
  SearchResponse,
  SuggestionOptions,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// GitHub Issue Driver Options
export interface GitHubIssueDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token
  cache?: CacheConfig;
}

// GitHub Issue Search Options - matches official API parameters
export interface GitHubIssueSearchOptions extends SearchOptions {
  sort?: "comments" | "reactions" | "created" | "updated";
  order?: "asc" | "desc";
}

// GitHub Issue API response types
export interface GitHubIssueLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description: string;
}

export interface GitHubIssueUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
}

export interface GitHubIssue {
  id: number;
  node_id: string;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: string;
  title: string;
  body: string;
  user: GitHubIssueUser;
  labels: GitHubIssueLabel[];
  milestone: any;
  locked: boolean;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  author_association: string;
  active_lock_reason: string;
  draft: boolean;
  pull_request: any;
  reactions: {
    url: string;
    total_count: number;
    plus_one: number;
    minus_one: number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  timeline_url: string;
  performed_via_github_app: any;
  state_reason: string;
}

export interface GitHubIssueSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

export default function githubIssueDriver(
  driverOptions: GitHubIssueDriverOptions = {},
): Driver {
  const { token } = driverOptions;
  const cache = createCache(driverOptions.cache);

  // Helper function to build query string with qualifiers
  function buildQuery(
    query: string,
    searchOptions: GitHubIssueSearchOptions,
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
    name: "github-issue",
    options: driverOptions,

    search: async (
      searchOptions: GitHubIssueSearchOptions,
    ): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      const limit = searchOptions.limit || cache.perPage || 30;
      const page = searchOptions.page || 1;
      const cacheKey = `github-issue:${query}:${page}:${limit}`;

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
          per_page: Math.min(limit, 100).toString(),
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
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Make API request
        const response: GitHubIssueSearchResponse = await ofetch(
          `https://api.github.com/search/issues?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((issue): any => ({
          title: `#${issue.number} ${issue.title}`,
          url: issue.html_url,
          snippet: issue.body
            ? issue.body.substring(0, 200) +
              (issue.body.length > 200 ? "..." : "")
            : "No description",
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
        console.error("GitHub Issue Search Error:", error);
        return { results: [] };
      }
    },

    // Basic suggestion support for common issue labels
    suggest: async (suggestOptions: SuggestionOptions): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      // Return common issue labels that match the query
      const commonLabels = [
        "bug",
        "enhancement",
        "documentation",
        "good first issue",
        "help wanted",
        "question",
        "wontfix",
        "duplicate",
        "invalid",
        "needs more info",
        "blocked",
        "priority",
        "critical",
        "high",
        "medium",
        "low",
        "security",
      ];

      return commonLabels
        .filter((label) => label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
  };
}
