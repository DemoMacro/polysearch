import { defineCommand } from "citty";
import { createPolySearch } from "../search";
import { DRIVER_NAMES, createDriver } from "../drivers/registry";

export const searchCommand = defineCommand({
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
      options: [...DRIVER_NAMES],
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
