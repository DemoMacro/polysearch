import { defineCommand } from "citty";
import { createPolySearch } from "../search";
import { DRIVER_NAMES, createDriver } from "../drivers/registry";

export const suggestCommand = defineCommand({
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
      options: [...DRIVER_NAMES],
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
