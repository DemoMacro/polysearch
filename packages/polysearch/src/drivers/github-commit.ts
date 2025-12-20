import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SearchOptions, SearchResponse } from "..";

// GitHub Commit Driver Options
export interface GitHubCommitDriverOptions extends DriverOptions {
  token?: string; // GitHub Personal Access Token (required for commit search)
}

// GitHub Commit Search Options - matches official API parameters
export interface GitHubCommitSearchOptions extends SearchOptions {
  sort?: "author-date" | "committer-date";
  order?: "asc" | "desc";
  per_page?: number; // Number of results per page (max 100)
  page?: number; // Page number for pagination (1-based)
}

// GitHub Commit API response types
export interface GitHubCommitItem {
  url: string;
  sha: string;
  html_url: string;
  comments_url: string;
  commit: {
    url: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      url: string;
      sha: string;
    };
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  author: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
  } | null;
  committer: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
  } | null;
  parents: Array<{
    url: string;
    sha: string;
  }>;
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      type: string;
      site_admin: boolean;
    };
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    issues_count: number;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    forks_count: number;
    mirror_url: string | null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: {
      key: string;
      name: string;
      spdx_id: string;
      url: string;
      node_id: string;
    } | null;
    allow_forking: boolean;
    is_template: boolean;
    web_commit_signoff_required: boolean;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
  };
  score: number;
}

export interface GitHubCommitSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubCommitItem[];
}

export default function githubCommitDriver(
  options: GitHubCommitDriverOptions = {},
): Driver {
  const { token } = options;

  return {
    name: "github-commit",
    options,

    search: async (
      searchOptions: GitHubCommitSearchOptions,
    ): Promise<SearchResponse> => {
      const { query, limit = 30, sort, order, per_page, page } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      // Commit search requires authentication
      if (!token) {
        console.error("GitHub Commit Search requires authentication token");
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

        // Make API request to commits endpoint
        const response: GitHubCommitSearchResponse = await ofetch(
          `https://api.github.com/search/commits?${searchParams}`,
          {
            method: "GET",
            headers,
          },
        );

        // Map GitHub response to SearchResult format
        const results = response.items.map((commit): any => ({
          title: `${commit.sha.substring(0, 7)} ${commit.commit.message.split("\n")[0]}`,
          url: commit.html_url,
          snippet: `Commit by ${commit.author?.login || commit.commit.author.name} in ${commit.repository.full_name}`,
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
        console.error("GitHub Commit Search Error:", error);

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes("403")) {
          console.error("GitHub API rate limit exceeded.");
        }

        // Handle authentication errors
        if (error instanceof Error && error.message.includes("401")) {
          console.error(
            "GitHub Commit Search requires valid authentication token.",
          );
        }

        return { results: [] };
      }
    },

    // GitHub commit search doesn't support suggestions
    suggest: async (): Promise<string[]> => [],
  };
}
