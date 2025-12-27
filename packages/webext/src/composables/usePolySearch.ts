import { ref, computed } from "vue";
import type { SearchResponse, SearchOptions } from "polysearch";
import {
  createSearchManager,
  type SearchEngineConfig,
  defaultSearchConfig,
} from "~/logic/search-config";

/**
 * PolySearch Composable
 * Simple wrapper around polysearch library
 */
export function usePolySearch() {
  // Search state
  const isSearching = ref(false);
  const searchResults = ref<SearchResponse["results"]>([]);
  const totalResults = ref<number | undefined>(undefined);
  const pagination = ref<SearchResponse["pagination"] | undefined>(undefined);
  const error = ref<string | null>(null);

  // Search engine config (loaded from storage)
  const searchConfig = ref<SearchEngineConfig>(defaultSearchConfig);

  // Current search parameters
  const currentQuery = ref("");
  const currentPage = ref(1);
  const perPage = ref(10);

  // Search manager (lazy loaded)
  let searchManager: ReturnType<typeof createSearchManager> | null = null;

  /**
   * Get or create search manager
   */
  function getSearchManager() {
    if (!searchManager) {
      searchManager = createSearchManager(searchConfig.value);
    }
    return searchManager;
  }

  /**
   * Recreate search manager (called when config is updated)
   */
  function recreateSearchManager() {
    searchManager = null;
    getSearchManager();
  }

  /**
   * Update search engine config
   */
  function updateConfig(config: Partial<SearchEngineConfig>) {
    searchConfig.value = {
      ...searchConfig.value,
      ...config,
    };
    recreateSearchManager();

    // Save to storage
    void browser.storage.local.set({ searchConfig: searchConfig.value });
  }

  /**
   * Load config from storage
   */
  async function loadConfig() {
    try {
      const result = await browser.storage.local.get("searchConfig");
      if (result.searchConfig) {
        searchConfig.value = result.searchConfig as SearchEngineConfig;
        recreateSearchManager();
      }
    } catch {
      // Silently ignore config loading errors
    }
  }

  /**
   * Execute search
   */
  async function search(query: string, options?: Partial<SearchOptions>) {
    if (!query.trim()) {
      return;
    }

    const page = options?.page || currentPage.value;
    const perPageNum = options?.perPage || perPage.value;

    // Update current params
    currentQuery.value = query;
    currentPage.value = page;
    perPage.value = perPageNum;

    // Execute search
    isSearching.value = true;
    error.value = null;

    try {
      const manager = getSearchManager();
      const response: SearchResponse = await manager.search({
        query,
        page,
        perPage: perPageNum,
      });

      // Update state
      searchResults.value = response.results;
      totalResults.value = response.totalResults;
      pagination.value = response.pagination;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Search failed";
      searchResults.value = [];
      totalResults.value = undefined;
      pagination.value = undefined;
    } finally {
      isSearching.value = false;
    }
  }

  /**
   * Get search suggestions
   */
  async function suggest(query: string): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const manager = getSearchManager();
      if (manager.suggest) {
        return await manager.suggest({ query });
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Go to specific page
   */
  async function goToPage(page: number) {
    // Calculate max page based on total results
    if (totalResults.value && perPage.value) {
      const maxPage = Math.ceil(totalResults.value / perPage.value);
      if (page > maxPage) {
        page = Math.max(1, maxPage);
      }
    }

    await search(currentQuery.value, {
      page,
      perPage: perPage.value,
    });
  }

  /**
   * Clear results
   */
  function clearResults() {
    searchResults.value = [];
    totalResults.value = undefined;
    pagination.value = undefined;
    currentQuery.value = "";
    error.value = null;
  }

  /**
   * Initialize (load config)
   */
  async function init() {
    await loadConfig();
  }

  // Computed properties
  const hasResults = computed(() => searchResults.value.length > 0);
  const hasNextPage = computed(() => {
    if (!totalResults.value || !pagination.value) return false;
    const { page = 1, perPage: perPageNum = 10 } = pagination.value;
    return page * perPageNum < totalResults.value;
  });
  const hasPrevPage = computed(() => {
    const page = currentPage.value || 1;
    return page > 1;
  });

  // Initialize
  void init();

  return {
    // State
    isSearching,
    searchResults,
    totalResults,
    pagination,
    error,
    currentQuery,
    currentPage,
    perPage,
    searchConfig,

    // Computed properties
    hasResults,
    hasNextPage,
    hasPrevPage,

    // Methods
    search,
    suggest,
    goToPage,
    clearResults,
    updateConfig,
    loadConfig,
    init,
  };
}
