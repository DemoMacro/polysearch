# PolySearch

![GitHub](https://img.shields.io/github/license/DemoMacro/polysearch)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Unified search interface supporting multiple search engines with intelligent result merging and weighted ranking

## Features

- 🌐 **Multi-Engine Support**: Google CSE, DuckDuckGo, NPM Registry, and HTTP Server with unified API
- 🔄 **Smart Result Merging**: Automatic deduplication and source tracking across engines
- ⚖️ **Weighted Ranking**: Configure engine priorities for customized result ordering
- 📝 **TypeScript First**: Full type safety with comprehensive search result types
- 🔧 **Flexible Operations**: Support for search, suggestions, and pagination
- 🚀 **High Performance**: Parallel execution with configurable timeouts
- 💾 **Built-in Caching**: Optional LRU cache support for improved performance
- 🌐 **HTTP Server**: Built-in HTTP server for easy API deployment
- 🔌 **HTTP Driver**: Connect to any HTTP search API with full parameter support

## Packages

This is a monorepo that contains the following packages:

- **[polysearch](./packages/polysearch/README.md)** - Unified search interface supporting multiple search engines with deduplication and weighted ranking
- **[polysearch-webext](./packages/webext/README.md)** - Browser extension for unified web search across multiple engines

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/DemoMacro/polysearch.git
cd polysearch

# Install dependencies
pnpm install
```

### Basic Usage

```typescript
import { createPolySearch } from "polysearch";
import hybridDriver from "polysearch/drivers/hybrid";
import googleCSEDriver from "polysearch/drivers/google-cse";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";
import npmDriver from "polysearch/drivers/npm";

// Create search manager with Google CSE driver
const googleSearch = createPolySearch({
  driver: googleCSEDriver({
    cx: "your-custom-search-engine-id", // Google CSE ID
  }),
});

// Create search manager with DuckDuckGo driver (with default caching)
const duckDuckGoSearch = createPolySearch({
  driver: duckduckgoDriver({
    cache: { perPage: 20, ttl: 3600, maxItems: 200 },
  }),
});

// Create search manager with NPM driver (caching disabled)
const npmSearch = createPolySearch({
  driver: npmDriver({
    cache: false, // Disable caching
  }),
});

// Create search manager with Hybrid driver
const hybridSearch = createPolySearch({
  driver: hybridDriver({
    drivers: [
      { driver: duckduckgoDriver(), weight: 0.7 },
      {
        driver: googleCSEDriver({ cx: "your-cse-id" }),
        weight: 0.3,
        timeout: 5000,
      },
    ],
  }),
});

// Search with Google CSE
const googleResults = await googleSearch.search({
  query: "TypeScript",
  perPage: 10,
});
console.log(`Found ${googleResults.results.length} results`);

// Get search suggestions
const suggestions = await googleSearch.suggest({
  query: "TypeS",
});
console.log("Suggestions:", suggestions);

// Search with DuckDuckGo
const duckResults = await duckDuckGoSearch.search({
  query: "TypeScript",
  perPage: 5,
});
console.log(`DuckDuckGo results: ${duckResults.results.length}`);

// Search with NPM Registry
const npmResults = await npmSearch.search({
  query: "react",
  perPage: 10,
});
console.log(`NPM packages found: ${npmResults.results.length}`);
console.log(`Total available: ${npmResults.totalResults}`);
```

### Advanced Usage

```typescript
import { createPolySearch } from "polysearch";
import hybridDriver from "polysearch/drivers/hybrid";
import googleCSEDriver from "polysearch/drivers/google-cse";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

// Create hybrid driver combining multiple engines
const search = createPolySearch({
  driver: hybridDriver({
    drivers: [
      { driver: duckduckgoDriver(), weight: 0.7 },
      {
        driver: googleCSEDriver({ cx: "your-cse-id" }),
        weight: 0.3,
        timeout: 5000,
      },
    ],
  }),
});

// Search with pagination support
const results = await search.search({
  query: "machine learning",
  page: 1,
  perPage: 20,
});

console.log("Total results:", results.totalResults);
console.log("Results count:", results.results.length);

// Access pagination information
if (results.pagination) {
  console.log("Current page:", results.pagination.page);
  console.log("PerPage:", results.pagination.perPage);
}

// Get search suggestions
const suggestions = await search.suggest({
  query: "machine lea",
});
console.log("Suggestions:", suggestions);
```

## Available Drivers

### Hybrid Driver

```typescript
import hybridDriver from "polysearch/drivers/hybrid";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";
import googleCSEDriver from "polysearch/drivers/google-cse";

const driver = hybridDriver({
  drivers: [
    { driver: duckduckgoDriver(), weight: 0.6 },
    {
      driver: googleCSEDriver({ cx: "your-cse-id" }),
      weight: 0.4,
      timeout: 3000,
    },
  ],
});

// Features:
// - Combines multiple search engines with weighted results
// - Parallel execution with configurable timeouts
// - Automatic result deduplication by URL
// - Source tracking: each result shows which drivers returned it
// - Fault-tolerant: continues even if some drivers fail
// - Configurable driver weights and timeouts
```

### Google CSE Driver

```typescript
import googleCSEDriver from "polysearch/drivers/google-cse";

const driver = googleCSEDriver({
  cx: "your-custom-search-engine-id", // Required: Google Custom Search Engine ID
});

// Features:
// - Full text search with Google Custom Search Engine
// - Rich result metadata and pagination
// - Autocomplete suggestions
```

### DuckDuckGo Driver

```typescript
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

const driver = duckduckgoDriver(); // No configuration required

// Features:
// - Privacy-focused search without tracking
// - Auto-complete suggestions
// - Zero-configuration setup
```

### NPM Registry Driver

```typescript
import npmDriver from "polysearch/drivers/npm";

const driver = npmDriver({
  registry: "https://registry.npmjs.org", // Optional: custom registry
  endpoint: "/-/v1/search", // Optional: custom endpoint path
  quality: 0.4, // Optional: emphasize package quality scoring
  popularity: 0.3, // Optional: emphasize popularity scoring
  maintenance: 0.3, // Optional: emphasize maintenance scoring
});

// Features:
// - Search npm packages with metadata and scoring
// - Quality, popularity, and maintenance metrics
// - Auto-complete suggestions for package names
// - Configurable scoring weights
// - Full package information (version, description, links)
// - True pagination support with page/perPage parameters
```

### HTTP Driver

```typescript
import httpDriver from "polysearch/drivers/http";

const driver = httpDriver({
  baseURL: "http://localhost:3000", // Required: search server URL
  timeout: 5000, // Optional: request timeout in ms
  headers: {
    // Optional: custom headers for authentication
    Authorization: "Bearer xxx",
  },
});

// Features:
// - Connect to any HTTP search server
// - Pass arbitrary parameters through query strings
// - Automatic parameter serialization (numbers, objects, JSON)
// - Custom headers for API authentication
// - Timeout configuration
```

## Server

### Quick Start

```typescript
import { createSearchServer } from "polysearch/servers/http";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

const server = createSearchServer({
  driver: duckduckgoDriver(),
});

server.serve(3000);

// API Endpoints:
// - GET /search?q=query&page=1&perPage=10 - Search with parameters
// - GET /suggest?q=query - Get suggestions
```

### Options

```typescript
createSearchServer({
  driver: googleCSEDriver({ cx: "your-cse-id" }), // Required
  authorize: async (request) => {
    /* auth logic */
  }, // Optional
});

server.serve(8080); // Start on port 8080
```

## API Reference

### `createPolySearch(options)`

Creates a new search manager instance with the specified driver.

**Parameters:**

- `options.driver` - Search driver instance (Google CSE, DuckDuckGo, etc.)

**Returns:** Search manager instance with methods below.

#### Methods

##### `search(options)`

Perform a search query.

**Parameters:**

- `query` (string) - Search query
- `page` (number, optional) - Page number for pagination (1-based)
- `perPage` (number, optional) - Results per page for pagination

**Returns:** `Promise<SearchResponse>` - Search results with metadata

##### `suggest(options)`

Get search suggestions/autocomplete.

**Parameters:**

- `query` (string) - Query term for suggestions

**Returns:** `Promise<string[]>` - Array of suggestion strings

### Search Response

```typescript
interface SearchResponse {
  results: SearchResult[]; // Array of search results
  totalResults?: number; // Total number of results (if available)
  pagination?: {
    page?: number; // Current page number (1-based)
    perPage?: number; // Results per page
  };
}

interface SearchResult {
  title: string; // Result title
  url: string; // Result URL
  snippet?: string; // Result description or snippet
  sources?: string[]; // Array of driver names that returned this result
}
```

### Development

```bash
# Development mode
pnpm dev

# Build the project
pnpm build

# Run linting
pnpm lint

# Test the implementation
bun playground/google-cse.ts
bun playground/duckduckgo.ts
bun playground/npm.ts
bun playground/hybrid.ts
bun playground/http-server.ts
bun playground/http.ts
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
