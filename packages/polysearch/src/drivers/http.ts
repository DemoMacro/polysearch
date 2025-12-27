import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
} from "..";

export interface HTTPDriverOptions extends DriverOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export default function httpDriver(options: HTTPDriverOptions): Driver {
  const { baseURL, timeout = 5000, headers = {} } = options;

  return {
    name: "http",
    options,

    search: async (searchOptions: SearchOptions): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      try {
        const url = new URL("/search", baseURL);

        Object.entries(searchOptions).forEach(([key, value]) => {
          if (value === undefined || value === null) return;

          if (key === "cache") {
            url.searchParams.set(key, JSON.stringify(value));
          } else if (typeof value === "object") {
            url.searchParams.set(key, JSON.stringify(value));
          } else {
            url.searchParams.set(key, String(value));
          }
        });

        const response = await ofetch<SearchResponse>(url.toString(), {
          method: "GET",
          timeout,
          headers,
        });

        return response;
      } catch (error) {
        console.error("HTTP search error:", error);
        return { results: [] };
      }
    },

    suggest: async (options: SuggestionOptions): Promise<string[]> => {
      const { query } = options;

      if (!query.trim()) {
        return [];
      }

      try {
        const url = new URL("/suggest", baseURL);

        Object.entries(options).forEach(([key, value]) => {
          if (value === undefined || value === null) return;

          if (typeof value === "object") {
            url.searchParams.set(key, JSON.stringify(value));
          } else {
            url.searchParams.set(key, String(value));
          }
        });

        const response = await ofetch(url.toString(), {
          method: "GET",
          timeout,
          headers,
        });

        // Handle both { suggestions: [] } and direct array formats
        if (Array.isArray(response)) {
          return response;
        }
        if (
          response &&
          typeof response === "object" &&
          "suggestions" in response &&
          Array.isArray(response.suggestions)
        ) {
          return response.suggestions;
        }

        return [];
      } catch (error) {
        console.error("HTTP suggest error:", error);
        return [];
      }
    },
  };
}
