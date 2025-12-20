import { ofetch } from "ofetch";
import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
} from "..";

// DuckDuckGo API response types
export interface DuckDuckGoResult {
  FirstURL: string;
  Result: string;
  Text: string;
  Icon?: {
    Height?: number | string;
    URL?: string;
    Width?: number | string;
  };
}

export interface DuckDuckGoResponse {
  Abstract: string;
  AbstractSource: string;
  AbstractText: string;
  AbstractURL: string;
  Answer: string;
  AnswerType: string;
  Definition: string;
  DefinitionSource: string;
  DefinitionURL: string;
  Entity: string;
  Heading: string;
  Image: string;
  ImageHeight: number;
  ImageIsLogo: number;
  ImageWidth: number;
  OfficialDomain: string;
  OfficialWebsite: string;
  Redirect: string;
  RelatedTopics: DuckDuckGoResult[];
  Results: DuckDuckGoResult[];
  Type: string;
  meta: Record<string, unknown>;
}

export interface DuckDuckGoSuggestion {
  phrase: string;
}

export interface DuckDuckGoDriverOptions extends DriverOptions {
  // DuckDuckGo doesn't require any specific options for basic usage
}

export default function duckduckgoDriver(
  options: DuckDuckGoDriverOptions = {},
): Driver {
  return {
    name: "duckduckgo",
    options,

    search: async (options: SearchOptions): Promise<SearchResponse> => {
      const { query } = options;

      if (!query.trim()) {
        return { results: [] };
      }

      try {
        // Build search URL
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

        // Send request
        const response = await ofetch(url, {
          method: "GET",
        });

        // Handle Blob response from ofetch
        const data: DuckDuckGoResponse =
          response instanceof Blob
            ? JSON.parse(await response.text())
            : response;

        // Collect all potential results from different sources
        let allResults: DuckDuckGoResult[] = [];

        // Add direct Results
        if (data.Results && Array.isArray(data.Results)) {
          allResults.push(...data.Results);
        }

        // Add RelatedTopics that look like search results (have FirstURL and Result)
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          const relatedResults = data.RelatedTopics.filter(
            (item: DuckDuckGoResult) => item.FirstURL && item.Result,
          );
          allResults.push(...relatedResults);
        }

        // Add Abstract as a result if it exists and has URL
        if (data.Abstract && data.AbstractURL && data.AbstractText) {
          allResults.push({
            FirstURL: data.AbstractURL,
            Result: `<a href="${data.AbstractURL}">${data.Heading || "Abstract"}</a>`,
            Text: data.AbstractText,
          });
        }

        // Process results
        const processedResults = (
          options.perPage ? allResults.slice(0, options.perPage) : allResults
        ).map((item: DuckDuckGoResult) => ({
          title:
            extractTitleFromResult(item.Result) ||
            item.Text ||
            item.FirstURL ||
            "",
          url: item.FirstURL || "",
          snippet: extractTextFromResult(item.Result) || item.Text || "",
        }));

        return {
          results: processedResults,
          totalResults: allResults.length,
        };
      } catch (error) {
        console.error("DuckDuckGo search error:", error);
        return { results: [] };
      }
    },

    suggest: async (options: SuggestionOptions): Promise<string[]> => {
      const { query } = options;

      if (!query.trim()) {
        return [];
      }

      try {
        // Build autocomplete URL
        const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&kl=wt-wt`;

        // Send request
        const response = await ofetch(url, {
          method: "GET",
        });

        // Handle Blob response from ofetch
        const data =
          response instanceof Blob
            ? JSON.parse(await response.text())
            : response;

        // Extract suggestions from the response
        if (Array.isArray(data)) {
          return data
            .map((item: DuckDuckGoSuggestion) => item.phrase || "")
            .filter(Boolean);
        }

        return [];
      } catch (error) {
        console.error("DuckDuckGo autocomplete error:", error);
        return [];
      }
    },
  };
}

// Helper function to extract title from HTML result string
function extractTitleFromResult(resultHtml: string): string {
  if (!resultHtml || typeof resultHtml !== "string") {
    return "";
  }

  // Extract text between <a> and </a> tags, and remove HTML tags
  const match = resultHtml.match(/<a[^>]*>(.*?)<\/a>/i);
  if (match) {
    // Remove HTML tags from the matched content
    return match[1].replace(/<[^>]*>/g, "").trim();
  }

  // Fallback: just remove all HTML tags and get first non-empty part
  const cleanText = resultHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleanText.split(" - ")[0] || cleanText;
}

// Helper function to extract text content from HTML result string
function extractTextFromResult(resultHtml: string): string {
  if (!resultHtml || typeof resultHtml !== "string") {
    return "";
  }

  // Remove HTML tags and get clean text
  return resultHtml
    .replace(/<[^>]*>/g, " ") // Replace HTML tags with spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
}
