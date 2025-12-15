import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SearchOptions,
  SearchResponse,
  SuggestionOptions,
} from "..";

// GitHub Issue Driver Options
export interface GitHubIssueDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token
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
  options: GitHubIssueDriverOptions = {},
): Driver {
  const { token } = options;

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
    options,

    search: async (
      searchOptions: GitHubIssueSearchOptions,
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

        return {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            incomplete_results: response.incomplete_results,
          },
        };
      } catch (error) {
        console.error("GitHub Issue Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error(
            "GitHub API rate limit exceeded. Consider using a token.",
          );
        }

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
