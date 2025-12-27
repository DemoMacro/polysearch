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

// Google CSE specific search options
export interface GoogleCSESearchOptions extends SearchOptions {
  cr?: string; // Country restriction
  gl?: string; // Country of search
  hl?: string; // Interface language
  lr?: string; // Language restriction
  safe?: "active" | "off";
  userAgent?: string; // Custom User-Agent header
}

// Google CSE API response types
export interface GoogleCSEPage {
  label: string;
  start: string;
}

export interface GoogleCSEPagination {
  page?: number;
  perPage?: number;
}

export interface GoogleCSEResult {
  titleNoFormatting: string;
  title: string;
  unescapedUrl: string;
  url: string;
  contentNoFormatting: string;
  content: string;
  clicktrackUrl?: string;
  formattedUrl?: string;
  visibleUrl?: string;
}

export interface GoogleCSECursor {
  currentPageIndex: number;
  estimatedResultCount?: string;
  resultCount?: string;
  searchResultTime?: string;
  pages: GoogleCSEPage[];
  moreResultsUrl?: string;
}

// Complete Google CSE API response type
export interface GoogleCSEResponse {
  results: GoogleCSEResult[];
  cursor: GoogleCSECursor;
  context?: {
    title: string;
    total_results?: string;
  };
  findMoreOnGoogle?: {
    url: string;
  };
}

// Google CSE suggestion response type (JSONP format)
export interface GoogleCSESuggestionResponse {
  query: string;
  suggestions: [string, number][];
}

// Google CSE specific response type
export interface GoogleCSESearchResponse extends SearchResponse {
  pagination?: GoogleCSEPagination;
}

export interface GoogleCSEDriverOptions extends DriverOptions {
  cx: string; // Custom Search Engine ID
  cache?: CacheConfig;
}

// Helper function to get CSE token, version and fexp
async function getCSEData(
  cx: string,
): Promise<{ token: string; version: string; fexp: string[] } | null> {
  try {
    const url = `https://cse.google.com/cse.js?newwindow=1&hpg=1&cx=${cx}`;
    const response = await ofetch(url, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "User-Agent": DEFAULT_USER_AGENT,
        Referer: `https://cse.google.com/cse?cx=${cx}`,
      },
    });

    // Extract cse_token from the JavaScript response
    const tokenMatch = response.match(/"cse_token":\s*"([^"]+)"/);
    const versionMatch = response.match(/"cselibVersion":\s*"([^"]+)"/);
    const expMatch = response.match(/"exp":\s*(\[[^\]]*\])/);

    if (!tokenMatch || !versionMatch || !expMatch) {
      return null;
    }

    return {
      token: tokenMatch[1],
      version: versionMatch[1],
      fexp: JSON.parse(expMatch[1]),
    };
  } catch (error) {
    console.error("Failed to get CSE data:", error);
    return null;
  }
}

// Default User-Agent header
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

export default function googleCSEDriver(
  driverOptions: GoogleCSEDriverOptions,
): Driver {
  const { cx } = driverOptions;
  const cache = createCache(driverOptions.cache);

  return {
    name: "google-cse",
    options: driverOptions,

    search: async (
      searchOptions: GoogleCSESearchOptions,
    ): Promise<GoogleCSESearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      const perPage = searchOptions.perPage || cache.perPage || 10;
      const page = searchOptions.page || 1;
      const cacheKey = `google-cse:${cx}:${query}:${page}:${perPage}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        // Get CSE data first
        const cseData = await getCSEData(cx);
        if (!cseData) {
          throw new Error("Failed to obtain CSE data");
        }

        // Build search URL
        const url = new URL("https://cse.google.com/cse/element/v1");
        url.searchParams.set("rsz", "filtered_cse");
        url.searchParams.set("num", perPage.toString());
        url.searchParams.set("hl", searchOptions.hl || "en");
        url.searchParams.set("source", "gcsc");
        url.searchParams.set("cx", cx);
        url.searchParams.set("q", query);
        url.searchParams.set("safe", searchOptions.safe || "active");
        url.searchParams.set("start", ((page - 1) * perPage + 1).toString());

        // Optional Google CSE specific parameters
        if (searchOptions.cr) url.searchParams.set("cr", searchOptions.cr);
        if (searchOptions.gl) url.searchParams.set("gl", searchOptions.gl);
        if (searchOptions.lr) url.searchParams.set("lr", searchOptions.lr);

        url.searchParams.set("cse_tok", cseData.token);
        url.searchParams.set("cselibv", cseData.version);
        url.searchParams.set("exp", cseData.fexp.join(","));
        url.searchParams.set("cseclient", "hosted-page-client");
        url.searchParams.set("rurl", `https://cse.google.com/cse?cx=${cx}`);

        // Generate random callback name matching the format from cse_token.ts
        const callbackName = `google_search_cse_api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        url.searchParams.set("callback", callbackName);

        // Send request with proper headers
        const response = await ofetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "*/*",
            "User-Agent": searchOptions.userAgent || DEFAULT_USER_AGENT,
            Referer: `https://cse.google.com/cse?cx=${cx}`,
            "sec-fetch-dest": "script",
            "sec-fetch-mode": "no-cors",
            "sec-fetch-site": "same-origin",
          },
        });

        // Parse JSONP response
        // Response format: callbackName({results: [...], cursor: {...}})
        let responseText: string;
        if (typeof response === "string") {
          responseText = response;
        } else if (response && typeof response.text === "function") {
          responseText = await response.text();
        } else {
          responseText = String(response);
        }

        // Remove the comment line at the beginning
        const cleanResponse = responseText.replace(/\/\*O_o\*\/\n/, "");

        // Match the JSONP callback and capture the JSON content (including newlines)
        const jsonpMatch = cleanResponse.match(
          new RegExp(
            `${callbackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\((.*)\\);?$`,
            "s",
          ),
        );
        if (!jsonpMatch) {
          return { results: [] };
        }

        const data: GoogleCSEResponse = JSON.parse(jsonpMatch[1]);

        // Extract search results
        const results = Array.isArray(data.results)
          ? data.results.map((item: GoogleCSEResult) => ({
              title: item.titleNoFormatting || item.title || "",
              url: item.unescapedUrl || item.url || "",
              snippet: item.contentNoFormatting || item.content || undefined,
            }))
          : [];

        // Extract metadata from cursor
        const cursor: GoogleCSECursor = data.cursor || {};
        const totalResults = cursor.estimatedResultCount
          ? parseInt(cursor.estimatedResultCount.replace(/,/g, ""))
          : undefined;

        const result: GoogleCSESearchResponse = {
          results,
          totalResults,
          pagination: {
            page: page,
            perPage: perPage,
          },
        };

        // Cache the result
        await cache.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error("Google CSE search error:", error);
        return { results: [] };
      }
    },

    suggest: async (
      suggestOptions: SuggestionOptions & {
        hl?: string;
      },
    ): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      try {
        // Build request URL
        const url = new URL("https://clients1.google.com/complete/search");
        url.searchParams.set("client", "partner-web");
        url.searchParams.set("partnerid", cx);
        url.searchParams.set("q", query);
        url.searchParams.set("hl", suggestOptions.hl || "en");

        // Send request
        const response = await ofetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        });

        // Parse JSONP response
        // Response format: window.google.ac.h(["query", [["suggestion1", 0], ["suggestion2", 0]], {...}])
        const jsonpMatch = response.match(/window\.google\.ac\.h\((.*)\)/);
        if (!jsonpMatch) {
          return [];
        }

        const data = JSON.parse(jsonpMatch[1]);

        // Extract suggestions list
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return data[1].map((item: [string, number]) => item[0]);
        }

        return [];
      } catch (error) {
        console.error("Google CSE autocomplete error:", error);
        return [];
      }
    },
  };
}
