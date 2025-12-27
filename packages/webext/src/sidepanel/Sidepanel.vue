<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import type { TabsItem } from "@nuxt/ui";
import { usePolySearch } from "~/composables/usePolySearch";

const {
  isSearching,
  searchResults,
  totalResults,
  error,
  search,
  suggest,
  goToPage,
  currentPage,
  loadConfig,
} = usePolySearch();

// Search state
const searchQuery = ref("");
const searchTerm = ref("");
const suggestions = ref<string[]>([]);
const perPageOptions = [10, 20, 50];
const currentPerPage = ref(10);

// Format source name
function formatSourceName(source: string): string {
  const sourceMap: Record<string, string> = {
    "google-cse": "Google",
    duckduckgo: "DuckDuckGo",
  };
  return sourceMap[source] || source;
}

// Search history
const searchHistory = ref<Array<{ query: string; timestamp: number }>>([]);

// Define tabs
const tabs: TabsItem[] = [
  {
    label: "Search results",
    icon: "i-heroicons-magnifying-glass",
    slot: "search" as const,
  },
  {
    label: "History",
    icon: "i-heroicons-clock",
    slot: "history" as const,
  },
];

// Execute search
async function handleSearch(value?: string) {
  const query = value || searchTerm.value;
  if (!query?.trim()) return;

  searchQuery.value = query;

  // Add to history
  if (!searchHistory.value.find((h) => h.query === query)) {
    searchHistory.value.unshift({
      query: query,
      timestamp: Date.now(),
    });
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10);
    }
  }

  await search(query, {
    page: 1,
    perPage: currentPerPage.value,
  });
}

// Search from history
function searchFromHistory(query: string) {
  searchTerm.value = query;
  handleSearch(query);
}

// Clear history
function clearHistory() {
  searchHistory.value = [];
}

// Get search suggestions (async, non-blocking)
let suggestTimer: ReturnType<typeof setTimeout> | null = null;
async function updateSuggestions() {
  const trimmedQuery = searchTerm.value.trim();

  if (!trimmedQuery) {
    suggestions.value = [];
    return;
  }

  if (suggestTimer) clearTimeout(suggestTimer);

  // Immediately set current input as the first suggestion
  suggestions.value = [trimmedQuery];

  // Then fetch additional suggestions in background
  suggestTimer = setTimeout(async () => {
    const results = await suggest(searchTerm.value);
    // Filter out empty strings and remove duplicates, keep current input first
    const uniqueSuggestions = Array.from(
      new Set([trimmedQuery, ...results.filter((r) => r.trim())]),
    );
    suggestions.value = uniqueSuggestions;
  }, 300);
}

// Watch search term input, update suggestions
watch(searchTerm, () => {
  updateSuggestions();
});

// Open result
function openResult(url: string) {
  browser.tabs.create({ url });
}

// Open options page
function openOptionsPage() {
  browser.runtime.openOptionsPage();
}

// Pagination info
const totalPages = computed(() => {
  if (!totalResults.value || !currentPerPage.value) return 0;
  return Math.ceil(totalResults.value / currentPerPage.value);
});

// Get page range for pagination buttons

// Watch per page results change
let perPageChangeTimer: ReturnType<typeof setTimeout> | null = null;
watch(currentPerPage, async (newVal) => {
  if (perPageChangeTimer) clearTimeout(perPageChangeTimer);

  if (searchQuery.value.trim()) {
    // Debounce perPage changes to avoid excessive searches
    perPageChangeTimer = setTimeout(async () => {
      currentPage.value = 1; // Reset to first page
      await search(searchQuery.value, {
        page: 1,
        perPage: newVal,
      });
    }, 300);
  }
});

// Initialize
onMounted(async () => {
  await loadConfig();
});
</script>

<template>
  <UApp>
    <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center gap-2">
          <!-- Search box -->
          <UInputMenu
            v-model:search-term="searchTerm"
            :items="suggestions"
            icon="i-heroicons-magnifying-glass"
            size="lg"
            placeholder="Search anything..."
            :loading="isSearching"
            :disabled="isSearching"
            class="flex-1"
            ignore-filter
            @update:model-value="handleSearch"
          />

          <!-- Settings button -->
          <UButton
            icon="i-heroicons-cog-6-tooth"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="openOptionsPage"
          />
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1">
        <UTabs :items="tabs">
          <!-- Search results -->
          <template #search>
            <UScrollArea
              orientation="vertical"
              class="h-full"
              :ui="{ viewport: 'p-4' }"
            >
              <div v-if="error" class="mb-4">
                <UAlert
                  icon="i-heroicons-exclamation-triangle"
                  color="error"
                  variant="subtle"
                  :title="error"
                />
              </div>

              <!-- Search resultslist -->
              <div v-if="searchResults.length > 0">
                <!-- Result stats -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2 text-gray-500">
                    <span>{{ searchResults.length }} results</span>
                    <span v-if="totalResults">
                      / total {{ totalResults }} results
                    </span>
                  </div>

                  <USelectMenu
                    v-model="currentPerPage"
                    :items="perPageOptions"
                    size="sm"
                  />
                </div>

                <!-- Result cards -->
                <div class="space-y-3">
                  <UCard
                    v-for="(result, index) in searchResults"
                    :key="index"
                    class="cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all"
                    @click="openResult(result.url)"
                  >
                    <div class="flex items-start gap-3">
                      <div class="flex-1 min-w-0">
                        <h3
                          class="text-sm font-semibold line-clamp-2 mb-1 hover:text-primary-500 transition-colors"
                        >
                          {{ result.title }}
                        </h3>
                        <p
                          v-if="result.snippet"
                          class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2"
                        >
                          {{ result.snippet }}
                        </p>
                        <div class="flex items-center gap-2 mb-2">
                          <p
                            class="text-xs text-gray-400 truncate flex items-center gap-1"
                          >
                            <UIcon name="i-heroicons-link" class="w-3 h-3" />
                            {{ result.url }}
                          </p>
                        </div>
                        <!-- Source labels -->
                        <div
                          v-if="result.sources && result.sources.length > 0"
                          class="flex flex-wrap gap-1"
                        >
                          <UBadge
                            v-for="source in result.sources"
                            :key="source"
                            size="xs"
                            variant="soft"
                            color="neutral"
                          >
                            {{ formatSourceName(source) }}
                          </UBadge>
                        </div>
                      </div>
                      <UButton
                        icon="i-heroicons-arrow-top-right-on-square"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        :to="result.url"
                        target="_blank"
                        @click.stop
                      />
                    </div>
                  </UCard>
                </div>

                <!-- Pagination -->
                <div
                  v-if="totalPages > 1"
                  class="flex items-center justify-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                >
                  <UPagination
                    v-model:page="currentPage"
                    :total="totalResults || 0"
                    :items-per-page="currentPerPage"
                    :sibling-count="1"
                    @update:page="goToPage"
                  />
                </div>
              </div>

              <!-- Loading -->
              <div
                v-else-if="isSearching"
                class="flex flex-col items-center justify-center py-20"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="w-12 h-12 text-primary-500 animate-spin mb-4"
                />
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Searching......
                </p>
              </div>

              <!-- Empty state -->
              <UEmpty
                v-else
                icon="i-heroicons-magnifying-glass"
                title="Start Searching"
                description="Enter keywords to explore the web"
                class="py-20"
              />
            </UScrollArea>
          </template>

          <!-- History -->
          <template #history>
            <UScrollArea
              orientation="vertical"
              class="h-full"
              :ui="{ viewport: 'p-4' }"
            >
              <div v-if="searchHistory.length > 0" class="space-y-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold">Search history</p>
                  <UButton
                    icon="i-heroicons-trash"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="clearHistory"
                  >
                    Clear
                  </UButton>
                </div>

                <div class="space-y-2">
                  <UCard
                    v-for="(item, index) in searchHistory"
                    :key="index"
                    class="cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all"
                    @click="searchFromHistory(item.query)"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon
                          name="i-heroicons-clock"
                          class="w-4 h-4 text-gray-400"
                        />
                        <div>
                          <p class="text-sm font-medium">{{ item.query }}</p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ new Date(item.timestamp).toLocaleString() }}
                          </p>
                        </div>
                      </div>
                      <UIcon
                        name="i-heroicons-arrow-right"
                        class="w-4 h-4 text-gray-400"
                      />
                    </div>
                  </UCard>
                </div>
              </div>

              <UEmpty
                v-else
                icon="i-heroicons-clock"
                title="No history yet"
                description="Your search history will appear here"
                class="py-20"
              />
            </UScrollArea>
          </template>
        </UTabs>
      </div>
    </div>
  </UApp>
</template>
