<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePolySearch } from "~/composables/usePolySearch";

const { searchConfig, updateConfig, loadConfig } = usePolySearch();

const localConfig = ref({
  googleCSE: {
    enabled: false,
    cx: "",
  },
  duckduckgo: {
    enabled: true,
  },
});

const isSaving = ref(false);
const saveMessage = ref("");

async function saveConfig() {
  isSaving.value = true;
  saveMessage.value = "";

  try {
    await updateConfig(localConfig.value);
    saveMessage.value = "Configuration saved！";
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
    },
    duckduckgo: {
      enabled: true,
    },
  };
}

onMounted(async () => {
  await loadConfig();
  localConfig.value = {
    googleCSE: {
      enabled: searchConfig.value.googleCSE.enabled,
      cx: searchConfig.value.googleCSE.cx,
    },
    duckduckgo: {
      enabled: searchConfig.value.duckduckgo.enabled,
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

          <!-- DuckDuckGo -->
          <UFormField
            label="DuckDuckGo"
            description="Privacy-focused search engine"
            class="flex items-center justify-between py-4 gap-2"
          >
            <USwitch v-model="localConfig.duckduckgo.enabled" />
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
