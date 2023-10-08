import { state, config, loadLocales } from "./index";
import fs from 'fs/promises'
import { readFileSync } from 'node:fs'

const utileState = {
    configLoaded: false,
}
export function loadConfig() {
    if (utileState.configLoaded) {
        return
    }
    const txt = readFileSync(state.ConfigDir, 'utf8');
    const conf = JSON.parse(txt);
    for (const k in config) {
        if (conf[k] != undefined && conf[k] != null && Reflect.get(config, k) != undefined && Reflect.get(config, k) != null) {
            Reflect.set(config, k, conf[k]);
        }
    }

    utileState.configLoaded = true;
}

export async function saveConfig() {
    try {
        await fs.access(state.ConfigDir, fs.constants.F_OK)
    } catch (error) {
        const f = await fs.open(state.ConfigDir, 'w');
        await fs.writeFile(f, JSON.stringify(config), 'utf-8');
        f.close();
    }
    await fs.writeFile(state.ConfigDir, JSON.stringify(config), 'utf-8');
}
export function parseUrlToLocale(url: string) {
    const locales: string[] = loadLocales();
    const tmp = url.split('/').filter(s => s != '');
    let locale = config.default
    for (const s of locales) {
        if (s === tmp[0]) {
            locale = s;
            break
        }
    }
    return locale
}
export function localizePath(pageUrl: URL, locale?: string) {
    if (locale === undefined) {
        return pageUrl.pathname;
    }
    const curlocale = parseUrlToLocale(String(pageUrl.pathname))
    loadConfig();
    const baseUrl = import.meta.env.BASE_URL + (config.default === curlocale ? '' : curlocale);
    const targetUrl = import.meta.env.BASE_URL + (config.default === locale ? '' : locale);
    
    if (targetUrl == pageUrl.pathname || targetUrl + '/' == pageUrl.pathname) {
        return pageUrl.pathname;
    }
    
    if (baseUrl === '/') {
        return pageUrl.pathname?.replace(baseUrl, (targetUrl === '/' ? '' : targetUrl) + '/');
    }
    
    return pageUrl.pathname?.replace(baseUrl, targetUrl === '/' ? '' : targetUrl);
}

export function localizeUrl(url?: string) {

    url = url ? url : ''
    loadConfig();
    if (state.locale === config.default) {
        return url;
    }
    if (/^\/[\d\w]+/.test(url) || url === '/') {
        return '/' + state.locale + url;
    } else if (/^\.\/[\d\w]+/.test(url)) {
        return './' + state.locale + url;
    } else {

        return state.locale + '/' + url;
    }
}

export function insertToString(s: string, val: string, start: number) {
    const ar = s.split('');
    ar.splice(start + 1, 0, ...val.split(''));
    return ar.join('');
}