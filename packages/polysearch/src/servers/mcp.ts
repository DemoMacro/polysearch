import { H3, defineJsonRpcHandler, serve, type EventHandler } from "h3";
import { createPolySearch } from "../search";
import { DRIVER_NAMES, createDefaultPolyDriver, createPolyDriver } from "../drivers/registry";
import type { Driver } from "../types";
import { version } from "../../package.json";

export interface McpServerOptions {
  driver?: Driver;
  drivers?: string[];
}

// Resolve driver from options
function resolveDriver(options: McpServerOptions) {
  if (options.driver) return { driver: options.driver, availableDrivers: [...DRIVER_NAMES] as readonly string[] };
  if (options.drivers?.length) return { driver: createPolyDriver(options.drivers), availableDrivers: options.drivers };
  return { driver: createDefaultPolyDriver(), availableDrivers: [...DRIVER_NAMES] as readonly string[] };
}

// Execute a search tool call
export async function callSearchTool(
  args: Record<string, unknown>,
  driver: Driver,
) {
  const query = args.query as string;
  const perPage = (args.perPage as number) || 10;
  const page = (args.page as number) || 1;

  const search = createPolySearch({ driver });
  const response = await search.search({ query, perPage, page });

  const lines: string[] = [];
  lines.push(`Found ${response.totalResults ?? response.results.length} results:\n`);

  for (const [i, result] of response.results.entries()) {
    lines.push(`${i + 1}. ${result.title}`);
    lines.push(`   ${result.url}`);
    if (result.snippet) lines.push(`   ${result.snippet}`);
    if (result.sources?.length) lines.push(`   [${result.sources.join(", ")}]`);
    lines.push("");
  }

  if (response.results.length === 0) {
    lines.push(`No results found for "${query}".`);
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// Execute a suggest tool call
export async function callSuggestTool(
  args: Record<string, unknown>,
  driver: Driver,
) {
  const query = args.query as string;

  const search = createPolySearch({ driver });
  const suggestions = await search.suggest({ query });

  if (suggestions.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No suggestions for "${query}".` }],
    };
  }

  const text = `Suggestions for "${query}":\n${suggestions
    .slice(0, 10)
    .map((s) => `  - ${s}`)
    .join("\n")}`;

  return { content: [{ type: "text" as const, text }] };
}

// Build tool definitions for HTTP handler
function buildToolDefs(availableDrivers: readonly string[]) {
  return [
    {
      name: "search",
      description: "Search the web using various engines",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string" as const, description: "Search query" },
          driver: {
            type: "string" as const,
            enum: [...availableDrivers],
            default: "duckduckgo",
            description: "Search engine to use",
          },
          perPage: {
            type: "number" as const,
            minimum: 1,
            maximum: 50,
            default: 10,
            description: "Results per page",
          },
          page: {
            type: "number" as const,
            minimum: 1,
            default: 1,
            description: "Page number (1-based)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "suggest",
      description: "Get search suggestions/autocomplete",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string" as const, description: "Partial query for suggestions" },
          driver: {
            type: "string" as const,
            enum: [...availableDrivers],
            default: "duckduckgo",
            description: "Search engine to use",
          },
        },
        required: ["query"],
      },
    },
  ];
}

export function createMcpHandler(options: McpServerOptions = {}): EventHandler {
  const { driver, availableDrivers } = resolveDriver(options);
  const tools = buildToolDefs(availableDrivers);

  return defineJsonRpcHandler({
    methods: {
      initialize: () => ({
        protocolVersion: "2025-11-25",
        capabilities: { tools: {} },
        serverInfo: { name: "polysearch", version },
      }),

      "tools/list": () => ({ tools }),

      "tools/call": ({ params }) => {
        const p = params as Record<string, unknown>;
        const name = p.name as string;
        const args = (p.arguments ?? {}) as Record<string, unknown>;

        if (name === "search") return callSearchTool(args, driver);
        if (name === "suggest") return callSuggestTool(args, driver);

        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
      },
    },
  });
}

export function createMcpServer(options: McpServerOptions = {}): {
  handler: EventHandler;
  serve: (port?: number) => void;
} {
  const handler = createMcpHandler(options);
  const app = new H3().use("/mcp", handler);

  return {
    handler,
    serve: (port: number = 3000) => serve(app, { port }),
  };
}
