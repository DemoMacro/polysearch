import { defineCommand } from "citty";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPolySearch } from "../search";
import { createMcpServer } from "../servers/mcp";
import { DRIVER_NAMES, createDefaultPolyDriver, createPolyDriver } from "../drivers/registry";
import type { Driver } from "../types";
import { version } from "../../package.json";

export const mcpCommand = defineCommand({
  meta: {
    name: "mcp",
    description: "Start MCP server (stdio or HTTP transport)",
  },
  args: {
    transport: {
      type: "enum",
      description: "Transport mode",
      options: ["stdio", "http"],
      default: "stdio",
    },
    port: {
      type: "string",
      description: "Server port (HTTP transport only)",
      default: "3000",
    },
    drivers: {
      type: "string",
      description:
        "Comma-separated driver names for poly mode (default: duckduckgo,google-cse if GOOGLE_CSE_CX is set)",
    },
  },
  async run({ args }) {
    let options: { driver?: Driver; drivers?: string[] } = {};
    if (args.drivers) {
      const names = (args.drivers as string).split(",").map((s) => s.trim());
      options = { drivers: names };
    }

    if (args.transport === "http") {
      const port = Number(args.port) || 3000;
      const server = createMcpServer(options);
      console.log(`MCP server listening on http://localhost:${port}/mcp`);
      server.serve(port);
    } else {
      await startMcpStdio(options);
    }
  },
});

// Start MCP stdio transport using official SDK
async function startMcpStdio(options: { driver?: Driver; drivers?: string[] } = {}): Promise<void> {
  let driver: Driver;
  let availableDrivers: readonly string[];

  if (options.driver) {
    driver = options.driver;
    availableDrivers = [...DRIVER_NAMES];
  } else if (options.drivers?.length) {
    driver = createPolyDriver(options.drivers);
    availableDrivers = options.drivers;
  } else {
    driver = createDefaultPolyDriver();
    availableDrivers = [...DRIVER_NAMES];
  }

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
