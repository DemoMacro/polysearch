<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePolySearch } from "~/composables/usePolySearch";

const { searchConfig, updateConfig, loadConfig } = usePolySearch();

const localConfig = ref({
  googleCSE: {
    enabled: false,
    cx: "",
    weight: 1.0,
    timeout: 5000,
  },
  duckduckgo: {
    enabled: true,
    weight: 0.5,
    timeout: 5000,
  },
});

const isSaving = ref(false);
const saveMessage = ref("");

async function saveConfig() {
  isSaving.value = true;
  saveMessage.value = "";

  try {
    await updateConfig(localConfig.value);
    saveMessage.value = "Configuration saved!";
    setTimeout(() => {
      saveMessage.value = "";
    }, 2000);
  } catch (err) {
    saveMessage.value = "Save failed, please try again";
    console.error("Save config error:", err);
  } finally {
    isSaving.value = false;
  }
}

function resetConfig() {
  localConfig.value = {
    googleCSE: {
      enabled: false,
      cx: "",
      weight: 1.0,
      timeout: 5000,
    },
    duckduckgo: {
      enabled: true,
      weight: 0.5,
      timeout: 5000,
    },
  };
}

onMounted(async () => {
  await loadConfig();
  localConfig.value = {
    googleCSE: {
      enabled: searchConfig.value.googleCSE.enabled,
      cx: searchConfig.value.googleCSE.cx,
      weight: searchConfig.value.googleCSE.weight || 1.0,
      timeout: searchConfig.value.googleCSE.timeout || 5000,
    },
    duckduckgo: {
      enabled: searchConfig.value.duckduckgo.enabled,
      weight: searchConfig.value.duckduckgo.weight || 0.5,
      timeout: searchConfig.value.duckduckgo.timeout || 5000,
    },
  };
});
</script>

<template>
  <UApp>
    <UContainer>
      <!-- Header -->
      <UPageHeader
        title="PolySearch Settings"
        description="Configure your search engine preferences"
      />

      <!-- Save notification -->
      <UAlert
        v-if="saveMessage"
        icon="i-heroicons-check-circle"
        color="success"
        variant="subtle"
        :title="saveMessage"
        class="mb-4"
      />

      <USeparator />

      <!-- Configuration area -->
      <div class="space-y-4">
        <UCard :ui="{ container: 'divide-y divide-default' }">
          <!-- Google CSE -->
          <UFormField
            label="Google Custom Search Engine"
            description="More accurate search results"
            class="flex items-center justify-between py-4 gap-2"
          >
            <USwitch v-model="localConfig.googleCSE.enabled" />
          </UFormField>

          <UFormField
            v-if="localConfig.googleCSE.enabled"
            label="Google CSE ID"
            description="Enter your custom search engine ID"
            class="flex items-center justify-between py-4 gap-4"
          >
            <UInput
              v-model="localConfig.googleCSE.cx"
              class="flex-1"
              placeholder="Example: 017576662512468239146:omuauf_lfve"
            />
            <template #hint>
              <ULink
                href="https://developers.google.com/custom-search/docs/tutorial/creatingcse"
                target="_blank"
              >
                Learn how to create CSE →
              </ULink>
            </template>
          </UFormField>

          <UFormField
            v-if="localConfig.googleCSE.enabled"
            label="Weight"
            description="Higher weight = higher priority in results (0.1 - 10.0)"
            class="flex items-center justify-between py-4 gap-4"
          >
            <UInput
              v-model.number="localConfig.googleCSE.weight"
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              class="w-32"
            />
          </UFormField>

          <UFormField
            v-if="localConfig.googleCSE.enabled"
            label="Timeout (ms)"
            description="Request timeout in milliseconds (1000 - 30000)"
            class="flex items-center justify-between py-4 gap-4"
          >
            <UInput
              v-model.number="localConfig.googleCSE.timeout"
              type="number"
              step="1000"
              min="1000"
              max="30000"
              class="w-32"
            />
          </UFormField>

          <!-- DuckDuckGo -->
          <UFormField
            label="DuckDuckGo"
            description="Privacy-focused search engine"
            class="flex items-center justify-between py-4 gap-2"
          >
            <USwitch v-model="localConfig.duckduckgo.enabled" />
          </UFormField>

          <UFormField
            v-if="localConfig.duckduckgo.enabled"
            label="Weight"
            description="Higher weight = higher priority in results (0.1 - 10.0)"
            class="flex items-center justify-between py-4 gap-4"
          >
            <UInput
              v-model.number="localConfig.duckduckgo.weight"
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              class="w-32"
            />
          </UFormField>

          <UFormField
            v-if="localConfig.duckduckgo.enabled"
            label="Timeout (ms)"
            description="Request timeout in milliseconds (1000 - 30000)"
            class="flex items-center justify-between py-4 gap-4"
          >
            <UInput
              v-model.number="localConfig.duckduckgo.timeout"
              type="number"
              step="1000"
              min="1000"
              max="30000"
              class="w-32"
            />
          </UFormField>
        </UCard>
      </div>

      <!-- Action buttons -->
      <USeparator />

      <div class="flex justify-end gap-2 mt-6">
        <UButton
          icon="i-heroicons-arrow-path"
          variant="ghost"
          color="neutral"
          @click="resetConfig"
        >
          Reset Default
        </UButton>

        <UButton
          icon="i-heroicons-check"
          color="primary"
          :loading="isSaving"
          @click="saveConfig"
        >
          Save Configuration
        </UButton>
      </div>

      <!-- Footer info -->
      <UPageFooter>
        <template #right> PolySearch v1.0.0 - Powered by Nuxt UI </template>
      </UPageFooter>
    </UContainer>
  </UApp>
</template>
