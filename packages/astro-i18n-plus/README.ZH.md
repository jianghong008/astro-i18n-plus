[EN](./README.md) | 中文
##### Astro-i18n-plus是一个国际化插件，它可以自动执行基本操作，而无需手动页面管理或干扰src目录。

-  **零配置**
    没有额外的配置，您只需要专注于自己的业务，而不必担心翻译问题。
- **自动管理翻译文件**
    仅需把 *.json文件放入 public/locales/ 便可自动加载
- **无需管理多套语言模板**
    没有多余的模板文件生成
- **不会干扰您的项目**
    大多国际化插件会在src下生成多套语言模板，这会让人反感甚至直接修改用户的源码文件，经常造成奇奇怪怪的的问题（这是咱们弄这个的初衷）。
##### 安装
```
npm i astro-i18n-plus
```
如果您的目录是这样的：
```
/public/locales
    - zh.json
    - en.json
    - ru.json
/src/pages
    - index.astro
```
##### 使用说明
###### 第一步
``` javascript
// astro.config.mjs
import astroI18nPlus from 'astro-i18n-plus';
export default defineConfig({
    integrations:[astroI18nPlus('en'),]
});
```
###### 第二步
```shell
npm run dev
```
运行项目后会在 ```.temp``` 目录下生成这些文件(**默认语言不会生成**)，git可以忽略它们
```
/.temp
    - zh
        - index.astro
    - ru
        - index.astro
```
###### 第三步
在模板文件 ```*.astro``` 引入并使用,**在使用```t```函数前记得初始化一下**
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

##### 客户端用法
直接使用(很明显不受限框架)
``` javascript
window.I18nClient.t('cards.0.title')

```