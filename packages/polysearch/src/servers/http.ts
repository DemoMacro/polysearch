import {
  defineHandler,
  EventHandlerWithFetch,
  H3,
  H3Event,
  HTTPError,
  serve,
  getQuery,
} from "h3";
import { createPolySearch } from "../search";
import { Driver, SearchOptions, SuggestionOptions } from "../types";

export type PolySearchServerRequest = {
  request: globalThis.Request;
  type: "search" | "suggest";
  query: string;
};

export interface PolySearchServerOptions {
  driver?: Driver;
  authorize?: (request: PolySearchServerRequest) => void | Promise<void>;
  resolvePath?: (event: H3Event) => string;
}

/**
 * This function creates a fetch handler for your search server.
 *
 * The search server will handle search and suggestion endpoints:
 * - /search: Perform search with query parameters
 * - /suggest: Get suggestions with query parameters
 *
 * API Endpoints:
 * - GET /search?q=typescript&page=1&perPage=10 - Search with query parameters
 * - GET /suggest?q=typescript - Get suggestions with query parameters
 *
 * Query Parameters:
 * - q (required): Search query string
 * - page: Page number for pagination (default: 1)
 * - perPage: Results per page (default: 10)
 * - cache: Cache configuration as JSON string (e.g., {"ttl":300,"maxItems":100})
 * - Other parameters are passed through to the driver
 *
 * @param options Search server configuration options
 * @returns An object containing the handler function
 */
export function createSearchHandler(
  opts: PolySearchServerOptions,
): EventHandlerWithFetch {
  if (!opts.driver) {
    throw new Error("Driver is required");
  }

  const searchInstance = createPolySearch({ driver: opts.driver });

  const handler = defineHandler(async (event) => {
    const path = opts.resolvePath?.(event) ?? event.url.pathname;
    const queryParams = getQuery(event);
    const q = queryParams.q || queryParams.query;

    if (!q) {
      throw HTTPError.status(400, "Query parameter 'q' or 'query' is required");
    }

    // Clean path for endpoint comparison
    const cleanPath = path.replace(/^\/+|\/+$/g, "");

    // Authorize Request
    try {
      await opts.authorize?.({
        type: cleanPath === "search" ? "search" : "suggest",
        request: event.req as Request,
        query: q,
      });
    } catch (error: any) {
      const httpError = HTTPError.isError(error)
        ? error
        : new HTTPError({
            status: 401,
            statusText: error?.message,
            cause: error,
          });
      throw httpError;
    }

    // Set response headers
    event.res.headers.set("Content-Type", "application/json");
    event.res.headers.set("Access-Control-Allow-Origin", "*");

    // Handle different endpoints
    if (cleanPath === "search") {
      // Build search options with proper type conversion
      const searchOptions: SearchOptions = {
        query: q,
      };

      // Parse standard numeric parameters
      if (queryParams.page) {
        searchOptions.page = parseInt(queryParams.page as string, 10);
      }
      if (queryParams.perPage) {
        searchOptions.perPage = parseInt(queryParams.perPage as string, 10);
      }

      // Parse cache config (JSON string)
      if (queryParams.cache) {
        try {
          searchOptions.cache = JSON.parse(queryParams.cache as string);
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Pass through any other parameters (driver-specific options)
      Object.entries(queryParams).forEach(([key, value]) => {
        if (
          !["q", "query", "page", "perPage", "cache"].includes(key) &&
          value !== undefined
        ) {
          (searchOptions as any)[key] = value;
        }
      });

      const results = await searchInstance.search(searchOptions);
      return JSON.stringify(results, null, 2);
    }

    if (cleanPath === "suggest") {
      const suggestOptions: SuggestionOptions = {
        query: q,
      };

      // Pass through any other parameters
      Object.entries(queryParams).forEach(([key, value]) => {
        if (!["q", "query"].includes(key) && value !== undefined) {
          (suggestOptions as any)[key] = value;
        }
      });

      const suggestions = await searchInstance.suggest(suggestOptions);
      return JSON.stringify({ suggestions }, null, 2);
    }

    throw HTTPError.status(404, "Not Found: Use /search or /suggest");
  });

  return handler;
}

/**
 * Create a complete search server
 */
export function createSearchServer(opts: PolySearchServerOptions = {}): {
  handler: EventHandlerWithFetch;
  serve: (port?: number) => void;
} {
  const handler = createSearchHandler(opts);
  const app = new H3().use("/**", handler);

  return {
    handler,
    serve: (port = 3000) => serve(app, { port }),
  };
}
