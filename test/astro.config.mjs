import { defineConfig } from 'astro/config';
import astroI18nPlus from 'astro-i18n-plus';

// https://astro.build/config
export default defineConfig({
    integrations:[astroI18nPlus('zh'),]
});
