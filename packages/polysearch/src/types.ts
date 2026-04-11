// Driver options
export interface DriverOptions {}

// Cache options
export interface CacheOptions {
  storage?: import("unstorage").Storage; // Storage instance (optional, defaults to LRU Cache)
  perPage?: number; // Default results per page
  ttl?: number; // Cache expiration time in seconds
  maxItems?: number; // Maximum items in LRU cache (default: 100)
}

// Cache configuration (can be options or false to disable)
export type CacheConfig = CacheOptions | false;

// Search result item
export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  sources?: string[]; // Array of driver names that returned this result
}

// Search response with metadata
export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  pagination?: {
    page?: number;
    perPage?: number;
  };
}

// Search options (record style for driver-specific parameter extensibility)
export interface SearchOptions extends Record<string, any> {
  query: string;
  page?: number;
  perPage?: number;
  cache?: CacheConfig;
}

// Suggestion options (autocomplete)
export interface SuggestionOptions extends Record<string, any> {
  query: string;
}

// Utility types
export type MaybePromise<T> = T | Promise<T>;

// Search driver interface
// OptionsT: driver configuration (e.g. token, cache)
export interface Driver<OptionsT = any> {
  name?: string;
  options?: OptionsT;

  // Core search method
  search: (options: SearchOptions) => MaybePromise<SearchResponse>;

  // Optional suggestion method (autocomplete)
  suggest?: (options: SuggestionOptions) => MaybePromise<string[]>;
}

// Search Manager configuration
export interface PolySearchOptions {
  driver: Driver;
  cache?: CacheConfig;
}
