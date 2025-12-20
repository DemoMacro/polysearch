import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub Topic Driver Options
export interface GitHubTopicDriverOptions extends DriverOptions {
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
  options: GitHubTopicDriverOptions = {},
): Driver {
  const { token } = options;

  return {
    name: "github-topic",
    options,

    search: async (
      searchOptions: GitHubTopicSearchOptions,
    ): Promise<SearchResponse> => {
      const { query, limit = 30, per_page, page } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      try {
        // Build GitHub API query
        const searchParams = new URLSearchParams({
          q: query,
          per_page: Math.min(per_page || limit, 100).toString(), // Use per_page if provided, else fallback to limit
        });

        // Add page parameter if provided
        if (page && page > 0) {
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
        console.error("GitHub Topic Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error(
            "GitHub API rate limit exceeded. Consider using a token.",
          );
        }

        return { results: [] };
      }
    },

    // Basic suggestion support for common topics
    suggest: async (suggestOptions: { query: string }): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      // Return common topics that match the query
      const commonTopics = [
        "react",
        "javascript",
        "typescript",
        "nodejs",
        "python",
        "machine-learning",
        "ai",
        "vue",
        "angular",
        "docker",
        "kubernetes",
        "aws",
        "go",
        "rust",
        "swift",
        "java",
        "php",
        "laravel",
        "ruby",
        "rails",
        "flutter",
        "android",
        "ios",
        "swift",
        "kotlin",
        "blockchain",
        "web3",
        "css",
        "html",
        "frontend",
        "backend",
        "devops",
        "testing",
        "api",
        "rest",
        "graphql",
        "database",
        "sql",
        "nosql",
      ];

      return commonTopics
        .filter((topic) => topic.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
  };
}
