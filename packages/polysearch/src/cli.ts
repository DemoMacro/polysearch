#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { version } from "../package.json";

import { searchCommand } from "./commands/search";
import { suggestCommand } from "./commands/suggest";
import { mcpCommand } from "./commands/mcp";

const main = defineCommand({
  meta: {
    name: "polysearch",
    version,
    description: "Unified search interface supporting multiple search engines",
  },
  subCommands: {
    search: searchCommand,
    suggest: suggestCommand,
    mcp: mcpCommand,
  },
});

void runMain(main);
