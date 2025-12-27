# polysearch

![npm version](https://img.shields.io/npm/v/polysearch)
![npm downloads](https://img.shields.io/npm/dw/polysearch)
![npm license](https://img.shields.io/npm/l/polysearch)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Unified search interface supporting multiple search engines with intelligent result merging and weighted ranking

## Features

- 🌐 **Multi-Engine Support**: Google CSE, DuckDuckGo, NPM Registry with unified API
- 🔄 **Smart Result Merging**: Automatic deduplication and source tracking across engines
- ⚖️ **Weighted Ranking**: Configure engine priorities for customized result ordering
- 📝 **TypeScript First**: Full type safety with comprehensive search result types
- 🔧 **Flexible Operations**: Support for search, suggestions, and pagination
- 🚀 **High Performance**: Parallel execution with configurable timeouts
- 💾 **Built-in Caching**: Optional LRU cache support for improved performance

## Installation

```bash
# Install with npm
$ npm install polysearch

# Install with yarn
$ yarn add polysearch

# Install with pnpm
$ pnpm add polysearch
```

## Quick Start

### Basic Setup

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
```

### Querying Search Results

```typescript
// Get all results for a query
const results = await googleSearch.search({
  query: "TypeScript",
  perPage: 10,
});

console.log(`Found ${results.results.length} results`);
results.results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.title}`);
  console.log(`   ${result.url}`);
  console.log(`   ${result.snippet}`);
});

// Get specific result type with limit
const limitedResults = await duckDuckGoSearch.search({
  query: "machine learning",
  perPage: 5,
});

// Get a single result
const firstResult = await googleSearch.search({
  query: "React hooks",
  perPage: 1,
});
```

### Search Suggestions/Autocomplete

```typescript
// Get search suggestions
const suggestions = await googleSearch.suggest({
  query: "TypeS",
});
console.log("Suggestions:", suggestions);

// Multiple suggestion queries
const queries = ["TypeS", "React", "Vu"];
const allSuggestions = await Promise.all(
  queries.map((query) => googleSearch.suggest({ query })),
);
```

### Working with Pagination and Metadata

```typescript
// Search with pagination support
const searchResults = await googleSearch.search({
  query: "machine learning",
  page: 1,
  perPage: 20,
});

console.log("Total results:", searchResults.totalResults);
console.log("Results count:", searchResults.results.length);

// Access pagination information
if (searchResults.pagination) {
  console.log("Current page:", searchResults.pagination.page);
  console.log("PerPage:", searchResults.pagination.perPage);
}

// Search NPM packages with pagination
const npmResults = await npmSearch.search({
  query: "react",
  page: 2,
  perPage: 10,
});

console.log(
  `NPM packages - Page ${npmResults.pagination?.page}: ${npmResults.results.length} results`,
);

// Search with custom page size
const customResults = await googleSearch.search({
  query: "typescript",
  perPage: 15,
});
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

## API Reference

### Caching

All drivers support optional caching to improve performance and reduce API calls:

```typescript
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

// Default LRU cache (100 items, 60s TTL)
const search1 = createPolySearch({
  driver: duckduckgoDriver({
    cache: { perPage: 20, ttl: 300, maxItems: 200 },
  }),
});

// Disable caching
const search2 = createPolySearch({
  driver: duckduckgoDriver({ cache: false }),
});

// Custom storage
const search3 = createPolySearch({
  driver: duckduckgoDriver({
    cache: {
      storage: createStorage({ driver: memoryDriver() }),
      perPage: 20,
      ttl: 600,
    },
  }),
});
```

#### Cache Options

- **perPage** (number) - Default results per page
- **ttl** (number) - Cache expiration time in seconds (default: 60)
- **maxItems** (number) - Maximum items in LRU cache (default: 100)
- **storage** (Storage) - Custom unstorage instance
- **false** - Disable caching

### Core Functions

#### `createPolySearch(options)`

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

### Types

#### SearchResponse

```typescript
interface SearchResponse {
  results: SearchResult[]; // Array of search results
  totalResults?: number; // Total number of results (if available)
  pagination?: {
    page?: number; // Current page number (1-based)
    perPage?: number; // Results per page
  };
}
```

#### SearchResult

```typescript
interface SearchResult {
  title: string; // Result title
  url: string; // Result URL
  snippet?: string; // Result description or snippet
  sources?: string[]; // Array of driver names that returned this result
}
```

#### Driver Options

##### GoogleCSEDriverOptions

```typescript
interface GoogleCSEDriverOptions {
  cx: string; // Custom Search Engine ID (required)
}
```

##### DuckDuckGoDriverOptions

```typescript
interface DuckDuckGoDriverOptions {
  // No configuration required
}
```

##### HybridDriverOptions

```typescript
interface HybridDriverOptions {
  drivers: Array<{
    driver: Driver;
    weight?: number; // Default: 1.0
    timeout?: number; // Timeout in ms for this driver
  }>;
}
```

##### NPMDriverOptions

```typescript
interface NPMDriverOptions {
  registry?: string; // NPM registry URL (default: https://registry.npmjs.org)
  endpoint?: string; // Search endpoint path (default: /-/v1/search)
  quality?: number; // Weight for quality scoring (0-1)
  popularity?: number; // Weight for popularity scoring (0-1)
  maintenance?: number; // Weight for maintenance scoring (0-1)
}
```

## Server

### Quick Start

```typescript
import { createSearchServer } from "polysearch/server";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

const server = createSearchServer({
  driver: duckduckgoDriver(),
});

server.serve(3000);
```

### API Endpoints

- `GET /search?q=typescript&limit=10` - Search with query parameters
- `GET /suggest?q=typescript` - Get suggestions with query parameters

## Development

### Build

```bash
# Development mode (with stub files)
pnpm dev

# Production build
pnpm build

# Pre-pack build (automatically runs before publish)
pnpm prepack
```

### Testing

```bash
# Test specific drivers
bun playground/google-cse.ts
bun playground/duckduckgo.ts
bun playground/npm.ts
bun playground/server.ts

# Run linting
pnpm lint

# Type checking
pnpm build # Build includes type checking
```

## License

- [MIT](LICENSE) &copy; [Demo Macro](https://imst.xyz/)
