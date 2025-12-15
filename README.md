# PolySearch

![GitHub](https://img.shields.io/github/license/DemoMacro/polysearch)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Universal search engine driver library supporting multiple search providers with unified API

## Features

- 🔍 **Multi-Engine Support**: Google CSE, DuckDuckGo with unified API
- 📝 **TypeScript First**: Full type safety with comprehensive search result types
- 🔧 **Flexible Operations**: Support for search, suggestions, and pagination
- 🚀 **High Performance**: Built on modern web APIs with minimal dependencies

## Packages

This is a monorepo that contains the following package:

- **[polysearch](./packages/polysearch/README.md)** - Universal search engine driver with TypeScript support

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
import googleCSEDriver from "polysearch/drivers/google-cse";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

// Create search manager with Google CSE driver
const googleSearch = createPolySearch({
  driver: googleCSEDriver({
    cx: "your-custom-search-engine-id", // Google CSE ID
  }),
});

// Create search manager with DuckDuckGo driver
const duckDuckGoSearch = createPolySearch({
  driver: duckduckgoDriver(),
});

// Search with Google CSE
const googleResults = await googleSearch.search({
  query: "TypeScript",
  limit: 10,
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
  limit: 5,
});
console.log(`DuckDuckGo results: ${duckResults.results.length}`);
```

### Advanced Usage

```typescript
import { createPolySearch } from "polysearch";
import googleCSEDriver from "polysearch/drivers/google-cse";

// Create search manager with Google CSE
const search = createPolySearch({
  driver: googleCSEDriver({
    cx: "your-custom-search-engine-id",
  }),
});

// Search with pagination support
const results = await search.search({
  query: "machine learning",
  limit: 20,
});

console.log("Total results:", results.totalResults);
console.log("Results count:", results.results.length);

// Access pagination information
if (results.pagination) {
  console.log("Current page:", results.pagination.currentPageIndex);
  console.log("Pages:", results.pagination.pages);
  console.log("Has next page:", results.pagination.hasNextPage);
}

// Get search suggestions
const suggestions = await search.suggest({
  query: "machine lea",
});
console.log("Suggestions:", suggestions);
```

## Available Drivers

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

## Server

### Quick Start

```typescript
import { createSearchServer } from "polysearch/server";
import duckduckgoDriver from "polysearch/drivers/duckduckgo";

// Create and start server
const server = createSearchServer({
  driver: duckduckgoDriver(),
});

server.serve(3000);
```

### API Endpoints

- `GET /search?q=typescript&limit=10` - Search with query parameters
- `GET /suggest?q=typescript` - Get suggestions with query parameters

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
- `limit` (number, optional) - Maximum number of results to return

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
  pagination?: Record<string, any>; // Pagination information (driver-specific)
}

interface SearchResult {
  title: string; // Result title
  url: string; // Result URL
  snippet?: string; // Result description or snippet
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
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
