#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { createPolySearch } from "./search";
import { createMcpServer } from "./servers/mcp";
import {
  DRIVER_NAMES,
  createDriver,
} from "./drivers/registry";

const driverNames = [...DRIVER_NAMES];

const searchCommand = defineCommand({
  meta: {
    name: "search",
    description: "Search using various engines",
  },
  args: {
    query: {
      type: "positional",
      description: "Search query",
      required: true,
    },
    driver: {
      type: "enum",
      description: "Search engine to use",
      options: driverNames,
      default: "duckduckgo",
    },
    perPage: {
      type: "string",
      description: "Results per page",
      default: "10",
    },
    page: {
      type: "string",
      description: "Page number (1-based)",
      default: "1",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      alias: "j",
    },
  },
  async run({ args }) {
    const driverName = args.driver as string;
    const search = createPolySearch({ driver: createDriver(driverName) });
    const results = await search.search({
      query: args.query as string,
      perPage: Number(args.perPage) || 10,
      page: Number(args.page) || 1,
    });

    if (args.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.results.length === 0) {
      console.log(`No results found for "${args.query}".`);
      return;
    }

    console.log(
      `Found ${results.totalResults ?? results.results.length} results (${driverName}):\n`,
    );

    for (const [i, result] of results.results.entries()) {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   ${result.url}`);
      if (result.snippet) {
        console.log(`   ${result.snippet}`);
      }
      if (result.sources?.length) {
        console.log(`   [${result.sources.join(", ")}]`);
      }
      console.log();
    }
  },
});

const suggestCommand = defineCommand({
  meta: {
    name: "suggest",
    description: "Get search suggestions",
  },
  args: {
    query: {
      type: "positional",
      description: "Partial query for suggestions",
      required: true,
    },
    driver: {
      type: "enum",
      description: "Search engine to use",
      options: driverNames,
      default: "duckduckgo",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      alias: "j",
    },
  },
  async run({ args }) {
    const driverName = args.driver as string;
    const search = createPolySearch({ driver: createDriver(driverName) });
    const suggestions = await search.suggest({ query: args.query as string });

    if (args.json) {
      console.log(JSON.stringify(suggestions, null, 2));
      return;
    }

    if (suggestions.length === 0) {
      console.log(`No suggestions for "${args.query}".`);
      return;
    }

    console.log(`Suggestions for "${args.query}" (${driverName}):`);
    for (const s of suggestions) {
      console.log(`  - ${s}`);
    }
  },
});

const mcpCommand = defineCommand({
  meta: {
    name: "mcp",
    description: "Start MCP server (JSON-RPC over HTTP)",
  },
  args: {
    port: {
      type: "string",
      description: "Server port",
      default: "3000",
    },
    drivers: {
      type: "string",
      description: "Comma-separated driver names for poly mode (default: duckduckgo,google-cse if GOOGLE_CSE_CX is set)",
    },
  },
  run({ args }) {
    const port = Number(args.port) || 3000;

    let options = {};
    if (args.drivers) {
      const names = (args.drivers as string).split(",").map((s) => s.trim());
      options = { drivers: names };
    }

    const server = createMcpServer(options);
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
    server.serve(port);
  },
});

const main = defineCommand({
  meta: {
    name: "polysearch",
    version: "0.0.9",
    description:
      "Unified search interface supporting multiple search engines",
  },
  subCommands: {
    search: searchCommand,
    suggest: suggestCommand,
    mcp: mcpCommand,
  },
});

void runMain(main);
