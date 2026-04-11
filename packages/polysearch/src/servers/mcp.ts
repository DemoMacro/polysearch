import { H3, defineJsonRpcHandler, serve, type EventHandler } from "h3";
import { createPolySearch } from "../search";
import { DRIVER_NAMES, createDefaultPolyDriver, createPolyDriver } from "../drivers/registry";
import type { Driver } from "../types";
import { version } from "../../package.json";

export interface McpServerOptions {
  driver?: Driver;
  drivers?: string[];
}

// Build tool definitions from available driver names
function buildTools(availableDrivers: readonly string[]) {
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

// Execute a tool call
async function callTool(
  name: string,
  args: Record<string, unknown>,
  driver: Driver,
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    if (name === "search") {
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

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    if (name === "suggest") {
      const query = args.query as string;

      const search = createPolySearch({ driver });
      const suggestions = await search.suggest({ query });

      if (suggestions.length === 0) {
        return {
          content: [{ type: "text", text: `No suggestions for "${query}".` }],
        };
      }

      const text = `Suggestions for "${query}":\n${suggestions
        .slice(0, 10)
        .map((s) => `  - ${s}`)
        .join("\n")}`;

      return { content: [{ type: "text", text }] };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Tool failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Resolve driver and tools from options
function resolveDriverAndTools(options: McpServerOptions) {
  let driver: Driver;
  let availableDrivers: readonly string[];

  if (options.driver) {
    driver = options.driver;
    availableDrivers = DRIVER_NAMES;
  } else if (options.drivers?.length) {
    driver = createPolyDriver(options.drivers!);
    availableDrivers = options.drivers;
  } else {
    driver = createDefaultPolyDriver();
    availableDrivers = DRIVER_NAMES;
  }

  return { driver, tools: buildTools(availableDrivers) };
}

// Handle a single JSON-RPC request and return the response
async function handleRequest(
  method: string,
  params: Record<string, unknown>,
  driver: Driver,
  tools: ReturnType<typeof buildTools>,
) {
  if (method === "initialize") {
    return {
      protocolVersion: "2026-04-12",
      capabilities: { tools: {} },
      serverInfo: { name: "polysearch", version },
    };
  }

  if (method === "tools/list") {
    return { tools };
  }

  if (method === "tools/call") {
    const name = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    return callTool(name, args, driver);
  }

  throw new Error(`Unknown method: ${method}`);
}

export function createMcpHandler(options: McpServerOptions = {}): EventHandler {
  const { driver, tools } = resolveDriverAndTools(options);

  return defineJsonRpcHandler({
    methods: {
      initialize: () => ({
        protocolVersion: "2026-04-12",
        capabilities: { tools: {} },
        serverInfo: { name: "polysearch", version },
      }),

      "tools/list": () => ({ tools }),

      "tools/call": ({ params }) => {
        const name = (params as Record<string, unknown>).name as string;
        const args = ((params as Record<string, unknown>).arguments ?? {}) as Record<
          string,
          unknown
        >;
        return callTool(name, args, driver);
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

// Start MCP stdio transport — reads JSON-RPC from stdin, writes responses to stdout
export async function startMcpStdio(options: McpServerOptions = {}): Promise<void> {
  const { driver, tools } = resolveDriverAndTools(options);
  const rl = require("readline").createInterface({ input: process.stdin });

  const write = (msg: object) => process.stdout.write(JSON.stringify(msg) + "\n");

  for await (const line of rl) {
    let message: { jsonrpc: string; id?: number; method?: string; params?: Record<string, unknown> };
    try {
      message = JSON.parse(line);
    } catch {
      write({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
      continue;
    }

    // Notification — no id, no response needed
    if (message.id === undefined) continue;

    try {
      const result = await handleRequest(message.method ?? "", message.params ?? {}, driver, tools);
      write({ jsonrpc: "2.0", id: message.id, result });
    } catch (error) {
      write({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32601,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
