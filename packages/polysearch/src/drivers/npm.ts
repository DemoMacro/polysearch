import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// NPM Registry API response types
export interface NPMSearchPackage {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  date: string;
  links: {
    npm: string;
    homepage: string;
    repository: string;
    bugs: string;
  };
  publisher: {
    username: string;
    email: string;
  };
  maintainers: Array<{
    username: string;
    email: string;
  }>;
}

export interface NPMSearchScore {
  final: number;
  detail: {
    quality: number;
    popularity: number;
    maintenance: number;
  };
}

export interface NPMSearchObject {
  package: NPMSearchPackage;
  score: NPMSearchScore;
  searchScore: number;
}

export interface NPMSearchResponse {
  objects: NPMSearchObject[];
  total: number;
  time: string;
}

export interface NPMPackage {
  _id: string;
  _rev: string;
  name: string;
  description: string;
  "dist-tags": Record<string, string>;
  versions: Record<string, NPMVersion>;
  time: {
    created: string;
    modified: string;
  };
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  repository?: {
    type?: string;
    url?: string;
  };
  readme: string;
  _attachments: Record<string, any>;
}

export interface NPMVersion {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  repository?: {
    type?: string;
    url?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: string;
  readme?: string;
  readmeFilename?: string;
  _id: string;
  dist: {
    shasum: string;
    tarball: string;
  };
  _npmVersion?: string;
  _npmUser?: {
    name: string;
    email: string;
  };
  maintainers?: Array<{
    name?: string;
    email?: string;
  }>;
  keywords?: string[];
}

export interface NPMDriverOptions extends DriverOptions {
  registry?: string; // NPM registry URL, defaults to https://registry.npmjs.org
  endpoint?: string; // Search API endpoint path, defaults to /-/v1/search
  quality?: number; // Weight for quality scoring (0-1)
  popularity?: number; // Weight for popularity scoring (0-1)
  maintenance?: number; // Weight for maintenance scoring (0-1)
  cache?: CacheConfig;
}

export default function npmDriver(
  driverOptions: NPMDriverOptions = {},
): Driver {
  const { registry = "https://registry.npmjs.org", endpoint = "/-/v1/search" } =
    driverOptions;

  const searchEndpoint = `${registry}${endpoint}`;
  const quality = driverOptions.quality;
  const popularity = driverOptions.popularity;
  const maintenance = driverOptions.maintenance;
  const cache = createCache(driverOptions.cache);

  return {
    name: "npm",
    options: driverOptions,

    search: async (searchOptions: SearchOptions): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      const perPage = searchOptions.perPage || cache.perPage || 20;
      const page = searchOptions.page || 1;
      const cacheKey = `npm:${query}:${page}:${perPage}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        // Build search URL with parameters
        const from = (page - 1) * perPage; // Calculate offset

        const searchParams = new URLSearchParams({
          text: query,
          size: Math.min(perPage, 250).toString(), // NPM API max is 250
          from: from.toString(),
        });

        // Add optional scoring weights if provided
        if (quality !== undefined)
          searchParams.set("quality", quality.toString());
        if (popularity !== undefined)
          searchParams.set("popularity", popularity.toString());
        if (maintenance !== undefined)
          searchParams.set("maintenance", maintenance.toString());

        const url = `${searchEndpoint}?${searchParams.toString()}`;

        // Send request to NPM search API
        const response = await ofetch<NPMSearchResponse>(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        // Process search results
        const result: SearchResponse = {
          results: response.objects.map((item: NPMSearchObject) => ({
            title: item.package.name,
            url: item.package.links.npm,
            snippet: `${item.package.description}\n\nVersion: ${item.package.version}\nQuality: ${(item.score.detail.quality * 100).toFixed(1)}%\nPopularity: ${(item.score.detail.popularity * 100).toFixed(1)}%\nMaintenance: ${(item.score.detail.maintenance * 100).toFixed(1)}%`,
          })),
          totalResults: response.total,
          pagination: {
            page: page,
            perPage: perPage,
          },
        };

        // Cache the result
        await cache.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error("NPM search error:", error);
        return { results: [] };
      }
    },

    suggest: async (options: SuggestionOptions): Promise<string[]> => {
      const { query } = options;

      if (!query.trim()) {
        return [];
      }

      try {
        // Use search API with a small limit to get suggestions
        const searchParams = new URLSearchParams({
          text: query,
          size: "5", // Get top 5 results for suggestions
        });

        const url = `${searchEndpoint}?${searchParams.toString()}`;

        const response = await ofetch<NPMSearchResponse>(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        // Extract package names as suggestions
        return response.objects.map(
          (item: NPMSearchObject) => item.package.name,
        );
      } catch (error) {
        console.error("NPM suggest error:", error);
        return [];
      }
    },
  };
}
