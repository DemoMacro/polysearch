import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub Label Driver Options
export interface GitHubLabelDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token (required for label search)
}

// GitHub Label Search Options - matches official API parameters
export interface GitHubLabelSearchOptions extends SearchOptions {
  repository_id?: number; // Required: limit search to specific repository
  per_page?: number; // Number of results per page (max 100)
  page?: number; // Page number for pagination (1-based)
}

// GitHub Label API response types
export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description: string | null;
}

export interface GitHubLabelSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubLabel[];
}

export default function githubLabelDriver(
  options: GitHubLabelDriverOptions = {},
): Driver {
  const { token } = options;

  return {
    name: "github-label",
    options,

    search: async (
      searchOptions: GitHubLabelSearchOptions,
    ): Promise<SearchResponse> => {
      const {
        query,
        limit = 30,
        per_page,
        page,
        repository_id,
      } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      // Label search requires authentication
      if (!token) {
        console.error("GitHub Label Search requires authentication token");
        return { results: [] };
      }

      try {
        // Build GitHub API query
        const searchParams = new URLSearchParams({
          q: query,
          per_page: Math.min(per_page || limit, 100).toString(), // Use per_page if provided, else fallback to limit
        });

        // Add repository_id filter if provided
        if (repository_id) {
          searchParams.set("repository_id", repository_id.toString());
        }

        // Add page parameter if provided
        if (page && page > 0) {
          searchParams.set("page", page.toString());
        }

        // Build headers
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${token}`,
        };

        // Make API request to labels endpoint
        const response: GitHubLabelSearchResponse = await ofetch(
          `https://api.github.com/search/labels?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((label): any => ({
          title: label.name,
          url: `https://github.com/search?q=label%3A${encodeURIComponent(label.name)}&type=issues`,
          snippet: label.description || `Label color: ${label.color}`,
        }));

        // Apply limit if needed (use per_page if provided, else fallback to limit)
        const limitedResults = results.slice(0, per_page || limit);

        return {
          results: limitedResults,
          totalResults: response.total_count,
          pagination: {
            page: searchOptions.page || 1,
            perPage: searchOptions.perPage || 30,
          },
        };
      } catch (error) {
        console.error("GitHub Label Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error("GitHub API rate limit exceeded.");
        }

        // Handle authentication errors
        if (error instanceof Error && error.message.includes("401")) {
          console.error(
            "GitHub Label Search requires valid authentication token.",
          );
        }

        return { results: [] };
      }
    },

    // Basic suggestion support for common labels
    suggest: async (suggestOptions: { query: string }): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      // Return common labels that match the query
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
        "dependencies",
        "feature request",
        "performance",
        "refactor",
        "test",
        "ci/cd",
        "deploy",
        "breaking change",
        "beginner-friendly",
        "up-for-grabs",
        "hacktoberfest",
      ];

      return commonLabels
        .filter((label) => label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
  };
}
