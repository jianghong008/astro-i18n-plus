EN | [中文](./README.ZH.md)
##### Astro-i18n plus is an international plugin that automates basic operations without the need for manual page management or interference with your src directory.

-  **Zero Configuration**
    There are no additional configurations, you just need to focus on your own business and not worry about translation issues.
- **Automatically load language files**
    Drop *. json in public/locales/ to automatically load the language list
- **No need to maintain multiple template pages**
    Automatic maintenance of multilingual templates
- **Not polluting the project**
    In the past, internationalized components would generate multiple sets of templates under src, which seemed uncomfortable

If your root directory looks like this
```
/public/locales
    - zh.json
    - en.json
    - ru.json
/src/pages
    - index.astro
```
##### Usage
###### step1
``` javascript
// astro.config.mjs
import astroI18nPlus from 'astro-i18n-plus';
export default defineConfig({
    integrations:[astroI18nPlus('en'),]
});
```
###### step2
```shell
npm run dev
```
These files will be generated in the ```.temp``` directory(**The default language will be ignored**),Git can ignore them.
```
/.temp
    - zh
        - index.astro
    - ru
        - index.astro
```
###### step3
In ```*.astro``` file,Can be used directly without specifying a language,**在使用```t```函数前记得初始化一下**
```typescript
// typescript
---
import { t,initLocale } from "astro-i18n-plus";
initLocale(Astro);
---
```
```html
<!-- html -->
<h1>{t("title")}</h1>
```