import {
  defineHandler,
  EventHandlerWithFetch,
  H3,
  H3Event,
  HTTPError,
  serve,
  getQuery,
} from "h3";
import { createPolySearch } from "./search";
import { Driver, SearchOptions, SuggestionOptions } from "./types";

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
 * - GET /search?q=typescript&limit=10 - Search with query parameters
 * - GET /suggest?q=typescript - Get suggestions with query parameters
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
      const searchOptions: SearchOptions = {
        query: q, // Explicitly set query
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        ...Object.fromEntries(
          Object.entries(queryParams).filter(
            ([key]) => key !== "q" && key !== "query" && key !== "limit",
          ),
        ), // Pass other query parameters
      };

      const results = await searchInstance.search(searchOptions);
      return JSON.stringify(results, null, 2);
    }

    if (cleanPath === "suggest") {
      const suggestOptions: SuggestionOptions = {
        query: q, // Explicitly set query
        ...Object.fromEntries(
          Object.entries(queryParams).filter(
            ([key]) => key !== "q" && key !== "query",
          ),
        ), // Pass other query parameters
      };

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
