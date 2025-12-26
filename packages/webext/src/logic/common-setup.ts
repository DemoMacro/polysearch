import type { App } from "vue";
import ui from "@nuxt/ui/vue-plugin";

export function setupApp(app: App<Element>) {
  // Inject a globally available `$app` object in template
  app.config.globalProperties.$app = {
    context: "",
  };

  // Provide access to `app` in script setup with `const app = inject('app')`
  app.provide("app", app.config.globalProperties.$app);

  // Install Nuxt UI plugin
  app.use(ui);

  // Here you can install additional plugins for all contexts: popup, options page and content-script.
  // example: app.use(i18n)
  // example excluding content-script context: if (context !== 'content-script') app.use(i18n)
}
