import type { AstroGlobal, AstroIntegration } from "astro"
import path from 'path'
import fs from 'fs/promises'
import { readFileSync, readdirSync } from 'node:fs'
import { AstroLocaleParse } from "./astro-parse";
import { clientTranslate, loadConfig, mapToObj, parseUrlToLocale, saveConfig } from "./utils";

export const config = {
    default: 'en',
}
const RootDir = process.cwd()
export const state = {
    messages: new Map<string, any>(),
    locales: new Array<string>(),
    locale: 'en',
    RootDir,
    TempPath: path.join(RootDir, '.temp'),
    PagesDir: path.join(RootDir, 'src/pages'),
    LocaleDir: path.join(RootDir, './public/locales'),
    ConfigDir: path.join(RootDir, '.temp/.conf'),
}

function loadMessage(locale?: string) {
    if (locale) {
        state.locale = locale
    }
    if (state.messages.has(state.locale)) {

        return
    }
    // 如果出错直接停止，不必捕获异常|If an error occurs, stop directly without catching the exception.
    const msg = readFileSync(path.join(state.LocaleDir, state.locale + '.json'), 'utf-8');
    state.messages.set(state.locale, JSON.parse(msg));
}

function loadAllMessages() {
    const ar = loadLocales()
    for (const l of ar) {
        loadMessage(l)
    }
}

export function loadLocales() {
    if (state.locales.length > 0) {
        return state.locales
    }
    const files = readdirSync(state.LocaleDir);
    const ar: string[] = [];
    for (const f of files) {
        const extname = path.extname(f);
        if (extname.toLowerCase() === '.json') {
            const locale = f.replace(extname, '');
            ar.push(locale);
        }
    }
    state.locales = ar
    return ar
}

async function getPages(dir = '') {
    const pagesDir = dir ? dir : state.PagesDir
    const files = await fs.readdir(pagesDir);
    let pages: string[] = []
    for (const f of files) {
        const tf = path.join(pagesDir, f);
        const state = await fs.stat(tf);
        if (state.isDirectory()) {
            const res = await getPages(tf);
            pages = pages.concat(res)
        } else {
            pages.push(tf);
        }
    }
    return pages
}

function parseRoutes(pages: string[]) {
    const routes: AstroRoute[] = []

    for (const page of pages) {

        const extname = path.extname(page);
        const pattern = page.replace(state.PagesDir, '').replace(extname, '').replaceAll(path.sep, '/');
        const entryPoint = page.replace(state.PagesDir, state.TempPath);
        routes.push({
            pattern: pattern.replace(/\/index$/, '/'),
            entryPoint,
            src: page,
            locale: '',
        })
    }
    return routes
}

async function genratePages(pages: AstroRoute[]) {
    const ar: AstroRoute[] = []
    const locales = loadLocales();
    if (locales.length > 0) {
        await fs.rm(state.TempPath, { recursive: true });
    }
    for (const locale of locales) {
        if (locale === state.locale) {
            continue;
        }
        for (const k in pages) {
            const page = { ...pages[k] }
            const fullName = page.entryPoint.replace(path.dirname(page.entryPoint), '');
            const fileName = fullName.replace(path.extname(fullName), '');
            const tempDir = path.join(state.TempPath, locale, page.pattern).replace(fileName, '');
            const astro = new AstroLocaleParse(locale, tempDir, page.src);
            page.entryPoint = path.join(tempDir, fullName);
            page.locale = locale;

            await astro.parseModules();
            await fs.mkdir(tempDir, { recursive: true });
            // file
            const f = await fs.open(path.join(tempDir, fullName), 'w');
            await fs.writeFile(f, astro.source.cur);
            f?.close();

            ar.push(page)
        }
    }
    return ar;
}
async function checkTempDir() {
    try {
        await fs.access(state.TempPath, fs.constants.F_OK)
    } catch (error) {
        fs.mkdir(state.TempPath)
    }
}
const astroI18nPlus: AstroIntegration = {
    name: 'astro-i18n-plus',
    hooks: {
        'astro:config:setup': async (options) => {
            if (options.isRestart) {
                // return
            }
            try {
                await checkTempDir();
                const temps = parseRoutes(await getPages());
                const pages = await genratePages(temps);
                AstroLocaleParse.BaseDir = state.RootDir;
                pages.forEach(page => {
                    const pattern = '/' + page.locale + (page.pattern != '/' ? page.pattern : '');
                    options.injectRoute({
                        pattern,
                        entryPoint: page.entryPoint,
                    });
                })
                loadAllMessages()
            } catch (error) {
                console.error('astro-i18n-plus:initialization failed!')
                console.error(error)
            }
            const client: I18nClient = {
                messages: mapToObj(state.messages),
                locales: loadLocales(),
                default: config.default,
                locale: config.default,
                t: function (k: string): string {
                    throw new Error("Function not implemented.");
                }
            }
            const clientScript = `window.I18nClient=${JSON.stringify(client)};window.I18nClient.t=${clientTranslate.toString()};`
            options.injectScript('head-inline', clientScript)
            saveConfig();
        },

    }
}

export function initLocale(astro: AstroGlobal) {
    state.locale = parseUrlToLocale(astro.url.pathname)
    loadMessage();
}

export function t(k: string): string {

    const ar = k.split('.');
    let o = null;

    let message = state.messages.get(state.locale);
    if (!message) {
        loadMessage();
        message = state.messages.get(state.locale);
    }

    for (const s of ar) {
        if (!o && message) {
            o = Reflect.get(message, s);
        } else if (o) {
            o = Reflect.get(o, s);
        }
    }

    return o ?? '';
}

export default (defaultLocale = 'zh') => {
    state.locale = defaultLocale;
    config.default = defaultLocale;
    return astroI18nPlus
}