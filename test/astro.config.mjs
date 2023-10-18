import { defineConfig } from 'astro/config';
import astroI18nPlus from 'astro-i18n-plus';
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [astroI18nPlus('zh'), tailwind(), react()]
});