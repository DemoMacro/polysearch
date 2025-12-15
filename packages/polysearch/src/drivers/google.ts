import { ofetch } from "ofetch";
import type { Driver, DriverOptions, SuggestionOptions } from "..";

// Google Suggestion specific options
export interface GoogleSuggestionOptions extends SuggestionOptions {
  hl?: string; // Interface language
  acceptLanguage?: string | { language: string; q?: number }[]; // Accept-Language header
  userAgent?: string; // Custom User-Agent header
}

// Google Autocomplete API response type
export interface GoogleSuggestionResponse {
  query: string;
  suggestions: GoogleSuggestionItem[];
}

export interface GoogleSuggestionItem {
  phrase: string;
}

// Default User-Agent header
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

// Helper function to generate Accept-Language header from array or string
function buildAcceptLanguage(
  acceptLanguage?: string | { language: string; q?: number }[],
): string {
  if (!acceptLanguage) return "en-US,en;q=0.9";

  if (typeof acceptLanguage === "string") {
    return acceptLanguage;
  }

  // Handle array of language codes with quality values
  return acceptLanguage
    .map((item) => {
      const quality = item.q !== undefined ? item.q : 1.0;
      return `${item.language};q=${quality.toFixed(1)}`;
    })
    .join(",");
}

export default function googleDriver(options: DriverOptions = {}): Driver {
  return {
    name: "google",
    options,

    search: async (): Promise<any> => {
      throw new Error(
        "Search functionality is not yet implemented for Google driver",
      );
    },

    suggest: async (
      suggestOptions: GoogleSuggestionOptions,
    ): Promise<string[]> => {
      const { query } = suggestOptions;

      if (!query.trim()) {
        return [];
      }

      try {
        // Build request URL for Google Autocomplete API
        const url = new URL("https://www.google.com/complete/search");
        url.searchParams.set("client", "gws-wiz");
        url.searchParams.set("q", query);
        url.searchParams.set("xssi", "t");
        url.searchParams.set("hl", suggestOptions.hl || "en");

        // Send request with proper headers
        const response = await ofetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "*/*",
            "Accept-Language": buildAcceptLanguage(
              suggestOptions.acceptLanguage,
            ),
            "User-Agent": suggestOptions.userAgent || DEFAULT_USER_AGENT,
            Referer: "https://www.google.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
          },
        });

        // Parse the response
        const responseText = response as string;

        // Extract JSON from the response
        // Google autocomplete returns format with prefix: )]}'
        // Followed by: ["query", [["suggestion1", 46, [512]], ["suggestion2", 0, [512]]]]
        let cleanResponseText = responseText;

        // Remove the Google prefix if it exists
        if (responseText.startsWith(")]}'")) {
          cleanResponseText = responseText.slice(4);
        }

        const data = JSON.parse(cleanResponseText);

        if (Array.isArray(data) && Array.isArray(data[0])) {
          return data[0]
            .map((item: any) => {
              if (Array.isArray(item) && typeof item[0] === "string") {
                // Remove HTML tags from the suggestion text
                return item[0].replace(/<[^>]*>/g, "");
              }
              return "";
            })
            .filter(Boolean);
        }

        return [];
      } catch (error) {
        console.error("Google autocomplete error:", error);
        return [];
      }
    },
  };
}
