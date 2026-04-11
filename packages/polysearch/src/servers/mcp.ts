import { H3, defineJsonRpcHandler, serve, type EventHandler } from "h3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPolySearch } from "../search";
import { DRIVER_NAMES, createDefaultPolyDriver, createPolyDriver } from "../drivers/registry";
import type { Driver } from "../types";
import { version } from "../../package.json";

export interface McpServerOptions {
  driver?: Driver;
  drivers?: string[];
}

// Execute a search tool call
async function callSearchTool(
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
async function callSuggestTool(
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

// Resolve driver from options
function resolveDriver(options: McpServerOptions) {
  if (options.driver) return { driver: options.driver, availableDrivers: [...DRIVER_NAMES] as readonly string[] };
  if (options.drivers?.length) return { driver: createPolyDriver(options.drivers), availableDrivers: options.drivers };
  return { driver: createDefaultPolyDriver(), availableDrivers: [...DRIVER_NAMES] as readonly string[] };
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
        protocolVersion: "2026-04-12",
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

// Start MCP stdio transport using official SDK
export async function startMcpStdio(options: McpServerOptions = {}): Promise<void> {
  const { driver, availableDrivers } = resolveDriver(options);

  const server = new McpServer({ name: "polysearch", version });

  // Register search tool
  server.registerTool(
    "search",
    {
      description: "Search the web using various engines",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        driver: z.enum(availableDrivers as [string, ...string[]]).default("duckduckgo").describe("Search engine to use"),
        perPage: z.number().min(1).max(50).default(10).describe("Results per page"),
        page: z.number().min(1).default(1).describe("Page number (1-based)"),
      }),
    },
    async (args) => {
      return callSearchTool(args as Record<string, unknown>, driver);
    },
  );

  // Register suggest tool
  server.registerTool(
    "suggest",
    {
      description: "Get search suggestions/autocomplete",
      inputSchema: z.object({
        query: z.string().describe("Partial query for suggestions"),
        driver: z.enum(availableDrivers as [string, ...string[]]).default("duckduckgo").describe("Search engine to use"),
      }),
    },
    async (args) => {
      return callSuggestTool(args as Record<string, unknown>, driver);
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
