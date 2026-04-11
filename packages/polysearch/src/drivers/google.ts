import { ofetch } from "ofetch";
import { withPage } from "../utils/playwright";
import type {
  Driver,
  DriverOptions,
  SuggestionOptions,
  SearchOptions,
  SearchResponse,
  CacheConfig,
} from "..";
import { createCache } from "../cache";

// Google Suggestion specific options
export interface GoogleSuggestionOptions extends SuggestionOptions {
  hl?: string; // Interface language
  userAgent?: string; // Custom User-Agent header
}

// Google search driver options
export interface GoogleDriverOptions extends DriverOptions {
  cache?: CacheConfig;
  hl?: string;
  userAgent?: string;
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

export default function googleDriver(driverOptions: GoogleDriverOptions = {}): Driver {
  const cache = createCache(driverOptions.cache);

  return {
    name: "google",
    options: driverOptions,

    search: async (searchOptions: SearchOptions): Promise<SearchResponse> => {
      const { query } = searchOptions;

      if (!query.trim()) {
        return { results: [] };
      }

      const perPage = searchOptions.perPage || cache.perPage || 10;
      const pageNum = searchOptions.page || 1;
      const cacheKey = `google:${query}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached && cached.results) {
        const offset = (pageNum - 1) * perPage;
        const paginatedResults = cached.results.slice(offset, offset + perPage);

        return {
          results: paginatedResults,
          totalResults: cached.totalResults,
          pagination: { page: pageNum, perPage },
        };
      }

      try {
        // Build Google search URL
        const url = new URL("https://www.google.com/search");
        url.searchParams.set("q", query);
        url.searchParams.set("hl", driverOptions.hl || "en");
        if (pageNum > 1) {
          url.searchParams.set("start", String((pageNum - 1) * perPage));
        }

        // Use Playwright to scrape Google search results
        const scrapeResult = await withPage(async (page) => {
          await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

          // Detect CAPTCHA / unusual traffic redirect
          const pageUrl = page.url();
          if (pageUrl.includes("/sorry/") || pageUrl.includes("consent")) {
            console.warn("Google search blocked: CAPTCHA or consent page detected");
            return { items: [], totalResults: 0 };
          }

          await page.waitForSelector("#search", { timeout: 15000 });

          // Destructure: results array + total from Google's #result-stats
          return page.evaluate(() => {
            const items: Array<{
              title: string;
              url: string;
              snippet: string;
            }> = [];

            // Extract total result count from "#result-stats"
            let totalResults = 0;
            const statsEl = document.getElementById("result-stats");
            if (statsEl) {
              const match = statsEl.textContent.match(/[\d,]+/);
              if (match) {
                totalResults = parseInt(match[0].replace(/,/g, ""), 10) || 0;
              }
            }

            // Result links: a[href] containing h3 as direct child
            const anchors = document.querySelectorAll("#rso a[href]");

            for (const anchor of anchors) {
              const h3 = anchor.querySelector(":scope > h3");
              if (!h3) continue;

              // Skip sitelinks (inside <tr>)
              if (anchor.closest("tr")) continue;

              let href = anchor.getAttribute("href") || "";
              if (!href.startsWith("http")) continue;

              const textFragment = href.indexOf("#:~:text=");
              if (textFragment !== -1) {
                href = href.slice(0, textFragment);
              }

              const container = anchor.closest(".MjjYud") || anchor;
              const snippetEl = container.querySelector(".VwiC3b");

              items.push({
                title: h3.textContent?.trim() || "",
                url: href,
                snippet: snippetEl?.textContent?.trim() || "",
              });
            }

            return { items, totalResults };
          });
        });

        const { items: extractedResults, totalResults: totalFromGoogle } = scrapeResult;

        // Cache all results
        const fullResponse: SearchResponse = {
          results: extractedResults,
          totalResults: totalFromGoogle || extractedResults.length,
        };
        await cache.set(cacheKey, fullResponse);

        // Slice results according to perPage (consistent with cached path)
        const offset = (pageNum - 1) * perPage;
        const paginatedResults = extractedResults.slice(offset, offset + perPage);

        return {
          results: paginatedResults,
          totalResults: fullResponse.totalResults,
          pagination: { page: pageNum, perPage },
        };
      } catch (error) {
        console.error("Google search error:", error);
        return { results: [] };
      }
    },

    suggest: async (suggestOptions: GoogleSuggestionOptions): Promise<string[]> => {
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
