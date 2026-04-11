import { defineCommand } from "citty";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createMcpServer, callSearchTool, callSuggestTool } from "../servers/mcp";
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
