# polysearch

![npm version](https://img.shields.io/npm/v/polysearch)
![npm downloads](https://img.shields.io/npm/dw/polysearch)
![npm license](https://img.shields.io/npm/l/polysearch)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Unified search interface supporting multiple search engines with intelligent result merging and weighted ranking

## Installation

```bash
npm install polysearch
```

```bash
yarn add polysearch
```

```bash
pnpm add polysearch
```

## Quick Start

```typescript
import { createPolySearch } from "polysearch";
import googleDriver from "polysearch/drivers/google";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";
import githubRepoDriver from "polysearch/drivers/github-repo";
import npmDriver from "polysearch/drivers/npm";
import polyDriver from "polysearch/drivers/poly";

const search = createPolySearch({ driver: googleDriver() });

const results = await search.search({ query: "TypeScript", perPage: 10 });
console.log(`Found ${results.results.length} results`);

const suggestions = await search.suggest({ query: "TypeS" });
console.log("Suggestions:", suggestions);
```

## Available Drivers

| Driver        | Import                             | Description                           |
| ------------- | ---------------------------------- | ------------------------------------- |
| Google        | `polysearch/drivers/google`        | Google search via Playwright          |
| Google CSE    | `polysearch/drivers/google-cse`    | Google Custom Search Engine API       |
| DuckDuckGo    | `polysearch/drivers/duckduckgo`    | Privacy-focused search                |
| NPM           | `polysearch/drivers/npm`           | NPM package registry search           |
| GitHub Repo   | `polysearch/drivers/github-repo`   | GitHub repository search              |
| GitHub Code   | `polysearch/drivers/github-code`   | GitHub code search                    |
| GitHub Issue  | `polysearch/drivers/github-issue`  | GitHub issue search                   |
| GitHub Commit | `polysearch/drivers/github-commit` | GitHub commit search                  |
| GitHub User   | `polysearch/drivers/github-user`   | GitHub user search                    |
| GitHub Label  | `polysearch/drivers/github-label`  | GitHub label search                   |
| GitHub Topic  | `polysearch/drivers/github-topic`  | GitHub topic search                   |
| HTTP          | `polysearch/drivers/http`          | Connect to any HTTP search API        |
| Poly          | `polysearch/drivers/poly`          | Combine multiple drivers with weights |

### Driver Options Example

Each driver accepts its own configuration options. For example, the GitHub repo driver supports sorting and ordering:

```typescript
import githubRepoDriver from "polysearch/drivers/github-repo";

const driver = githubRepoDriver({ token: process.env.GITHUB_TOKEN });

const results = await driver.search({
  query: "polysearch",
  perPage: 10,
  sort: "stars",
  order: "desc",
});
```

See each driver's TypeScript type definitions for available options.

### Caching

All drivers support optional caching:

```typescript
// Default LRU cache
const search = createPolySearch({
  driver: duckduckgoDriver({ cache: { perPage: 20, ttl: 3600, maxItems: 200 } }),
});

// Disable caching
const noCache = createPolySearch({ driver: duckduckgoDriver({ cache: false }) });

// Custom storage
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

const custom = createPolySearch({
  driver: duckduckgoDriver({
    cache: { storage: createStorage({ driver: memoryDriver() }), ttl: 600 },
  }),
});
```

## Server

### HTTP Server

```typescript
import { createSearchServer } from "polysearch/servers/http";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

const server = createSearchServer({ driver: duckduckgoDriver() });
server.serve(3000);

// GET /search?q=query&page=1&perPage=10
// GET /suggest?q=query
```

### MCP Server

```typescript
import { createMcpServer } from "polysearch/servers/mcp";

// Default: duckduckgo + google-cse (if GOOGLE_CSE_CX is set)
const server = createMcpServer();
server.serve(3000);

// Custom driver combination
const server = createMcpServer({ drivers: ["duckduckgo", "npm", "github-repo"] });

// Use handler directly
const { handler } = createMcpServer({ drivers: ["duckduckgo"] });
```

MCP server exposes JSON-RPC 2.0 endpoint at `/mcp` with tools: `search`, `suggest`.

#### Configure in Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "polysearch": {
      "command": "npx",
      "args": ["polysearch", "mcp"]
    }
  }
}
```

With custom drivers:

```json
{
  "mcpServers": {
    "polysearch": {
      "command": "npx",
      "args": ["polysearch", "mcp", "--drivers", "duckduckgo,npm,github-repo"]
    }
  }
}
```

## Types

```typescript
interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  pagination?: { page?: number; perPage?: number };
}

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  sources?: string[];
}
```

## License

- [MIT](LICENSE) &copy; [Demo Macro](https://www.demomacro.com/)
