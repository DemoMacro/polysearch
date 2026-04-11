# PolySearch

![GitHub](https://img.shields.io/github/license/DemoMacro/polysearch)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Unified search interface supporting multiple search engines with intelligent result merging and weighted ranking

## Features

- **Multi-Engine Support**: Google, Google CSE, DuckDuckGo, NPM, GitHub (repo/code/issue/commit/user/label/topic), HTTP
- **Smart Result Merging**: Automatic deduplication and source tracking across engines
- **Weighted Ranking**: Configure engine priorities for customized result ordering
- **TypeScript First**: Full type safety with comprehensive search result types
- **Flexible Operations**: Support for search, suggestions, and pagination
- **High Performance**: Parallel execution with configurable timeouts
- **Built-in Caching**: Optional LRU cache support for improved performance
- **MCP Server**: Built-in MCP server for AI assistant integration
- **HTTP Server**: Built-in HTTP server for easy API deployment

## Quick Start

### Installation

```bash
pnpm install
```

```bash
npm install polysearch
```

### Basic Usage

```typescript
import { createPolySearch } from "polysearch";
import googleDriver from "polysearch/drivers/google";
import googleCSEDriver from "polysearch/drivers/google-cse";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";
import githubRepoDriver from "polysearch/drivers/github-repo";
import npmDriver from "polysearch/drivers/npm";
import polyDriver from "polysearch/drivers/poly";

// Google search (browser automation via Playwright)
const googleSearch = createPolySearch({ driver: googleDriver() });

// Google Custom Search Engine
const cseSearch = createPolySearch({
  driver: googleCSEDriver({ cx: "your-cse-id" }),
});

// DuckDuckGo
const ddgSearch = createPolySearch({ driver: duckduckgoDriver() });

// GitHub repository search
const githubSearch = createPolySearch({
  driver: githubRepoDriver({ token: process.env.GITHUB_TOKEN }),
});

// NPM registry
const npmSearch = createPolySearch({ driver: npmDriver() });

// Poly: combine multiple engines with weights
const polySearch = createPolySearch({
  driver: polyDriver({
    drivers: [
      { driver: duckduckgoDriver(), weight: 0.7 },
      { driver: googleCSEDriver({ cx: "your-cse-id" }), weight: 0.3, timeout: 5000 },
    ],
  }),
});
```

### Search & Suggestions

```typescript
const results = await googleSearch.search({
  query: "TypeScript",
  page: 1,
  perPage: 10,
});

console.log(`Found ${results.results.length} results`);
console.log(`Total: ${results.totalResults}`);
console.log(`Page: ${results.pagination?.page}, PerPage: ${results.pagination?.perPage}`);

results.results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.title}`);
  console.log(`   ${r.url}`);
  console.log(`   ${r.snippet}`);
});

const suggestions = await googleSearch.suggest({ query: "TypeS" });
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

## CLI

```bash
# Search
polysearch search "TypeScript" --driver duckduckgo --perPage 5
polysearch search "react" --driver npm --json

# Suggestions
polysearch suggest "git" --driver google

# Start MCP server (stdio mode, for Claude Code etc.)
polysearch mcp
polysearch mcp --drivers "duckduckgo,npm"

# Start MCP server (HTTP mode)
polysearch mcp --transport http --port 3000
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

## Development

```bash
pnpm dev      # Development mode
pnpm build    # Production build
pnpm lint     # Lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
