import type { AstroIntegration } from "astro"
import path from 'path'
import fs from 'fs/promises'
import { AstroLocaleParse } from "./astro-parse";
const RootDir = process.cwd();
const TempPath = path.join(RootDir, '.temp');
const PagesDir = path.join(RootDir, 'src/pages');
AstroLocaleParse.BaseDir = RootDir;

interface AstroRoute {
    pattern: string
    entryPoint: string
    src: string
    locale: string
}

const locales = ['zh', 'ru']

async function getPages(dir = '') {
    const pagesDir = dir ? dir : PagesDir
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
        const pattern = page.replace(PagesDir, '').replace(extname, '').replaceAll(path.sep, '/');
        const entryPoint = page.replace(PagesDir, TempPath);
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
    await fs.rm(TempPath, { recursive: true });
    for (const locale of locales) {
        for (const k in pages) {
            const page = { ...pages[k] }
            const fullName = page.entryPoint.replace(path.dirname(page.entryPoint), '');
            const fileName = fullName.replace(path.extname(fullName), '');
            const tempDir = path.join(TempPath, locale, page.pattern).replace(fileName, '');
            const astro = new AstroLocaleParse(locale,tempDir, page.src);
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
async function checkTempDir(){
    try {
        await fs.access(TempPath,fs.constants.F_OK)
    } catch (error) {
        fs.mkdir(TempPath)
    }
}
const astroI18nPlus: AstroIntegration = {
    name: 'my-i18n',
    hooks: {
        'astro:config:setup': async (options: { injectRoute: any }) => {
            try {
                await checkTempDir();
                const temps = parseRoutes(await getPages());
                const pages = await genratePages(temps);
                pages.forEach(page => {
                    const pattern = '/' + page.locale + (page.pattern != '/' ? page.pattern : '');
                    options.injectRoute({
                        pattern,
                        entryPoint: page.entryPoint,
                    });
                })
            } catch (error) {
                console.error(error);
            }
        },

    }
}

const state = {
    messages: new Map<string, any>(),
    locales: new Array<string>(),
    locale: 'en'
}

async function loadMessage(locale = 'en') {
    const msg = await fs.readFile(path.join(RootDir, './public/locales/', locale + '.json'), 'utf-8');
    state.messages.set(locale, JSON.parse(msg));
}

export function setLocale(locale: string) {
    state.locale = locale;
    return loadMessage(locale);
}

export function t(k: string):string {
    const ar = k.split('.');
    let o = null;
    const message = state.messages.get(state.locale);
    if (!message) {
        return ''
    }
    for (const s of ar) {
        if (!o && message) {
            o = Reflect.get(message, s);
        } else if (o) {
            o = Reflect.get(o, s);
        }
    }
    return o;
}

export default () => {
    return astroI18nPlus
}