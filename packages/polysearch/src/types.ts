// Driver options
export interface DriverOptions {
  [key: string]: any;
}

// Cache options
export interface CacheOptions {
  storage?: import("unstorage").Storage; // Storage instance (optional, defaults to LRU Cache)
  perPage?: number; // Default results per page
  ttl?: number; // Cache expiration time in seconds
  maxItems?: number; // Maximum items in LRU cache (default: 100)
  [key: string]: any; // Additional cache configuration
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

// Search options
export interface SearchOptions {
  query: string;
  page?: number;
  perPage?: number;
  cache?: CacheConfig; // Optional: cache config or false to disable, modifying this creates a new cache
  [key: string]: any;
}

// Suggestion options (autocomplete)
export interface SuggestionOptions {
  query: string;
  [key: string]: any;
}

// Utility types
export type MaybePromise<T> = T | Promise<T>;

// Search driver interface
export interface Driver<OptionsT = DriverOptions> {
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
