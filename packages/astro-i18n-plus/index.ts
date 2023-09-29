import type { AstroIntegration } from "astro"
import path from 'path'
import fs from 'fs/promises'
import { readFileSync,readdirSync } from 'node:fs'
import { AstroLocaleParse } from "./astro-parse";
import { saveConfig } from "./utils";

export const config = {
    default: 'en',
}

export const state = {
    messages: new Map<string, any>(),
    locales: new Array<string>(),
    locale: 'en',
    localeChanged:false,
    RootDir: process.cwd(),
    TempPath: path.join(process.cwd(), '.temp'),
    PagesDir: path.join(process.cwd(), 'src/pages'),
    LocaleDir: path.join(process.cwd(), './public/locales'),
    ConfigDir: path.join(process.cwd(), '.temp/.conf'),
}

interface AstroRoute {
    pattern: string
    entryPoint: string
    src: string
    locale: string
}

function loadMessage() {
    if (state.messages.has(state.locale)) {
        return
    }
    
    try {
        const msg = readFileSync(path.join(state.LocaleDir, state.locale + '.json'), 'utf-8');
        state.messages.set(state.locale, JSON.parse(msg));
    } catch (error) {
        console.log(error)
    }
}

export function loadLocales() {

    const files = readdirSync(state.LocaleDir);
    const ar: string[] = [];
    for (const f of files) {
        const extname = path.extname(f);
        if (extname.toLowerCase() === '.json') {
            const locale = f.replace(extname, '');
            ar.push(locale);
        }
    }
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
    await fs.rm(state.TempPath, { recursive: true });
    const locales = await loadLocales();

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
            try {
                // fs.access(tempDir,fs.constants.S_IFDIR)
                await fs.mkdir(tempDir, { recursive: true });
            } catch (e) {
                console.log('--->', e)
            }
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
                saveConfig();
            } catch (error) {
                console.error(error);
            }
        },

    }
}

export function setLocale(locale: string) {
    state.locale = locale;
    state.localeChanged = true;
    loadMessage();
}

export function t(k: string): string {
    
    const ar = k.split('.');
    let o = null;

    const message = state.messages.get(state.locale);
    if (!message) {
        loadMessage();
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