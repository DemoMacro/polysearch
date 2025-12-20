// Driver options
export interface DriverOptions {
  [key: string]: any;
}

// Search result item
export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
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
}
