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
    loadConfig()
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
export function localizePath(pageUrl: URL | string, locale?: string) {
    const url = (typeof pageUrl !== 'string') ? pageUrl.pathname : pageUrl
    if (locale === undefined) {
        return url;
    }
    const curlocale = parseUrlToLocale(url)
    loadConfig();
    const baseUrl = import.meta.env.BASE_URL + (config.default === curlocale ? '' : curlocale);
    const targetUrl = import.meta.env.BASE_URL + (config.default === locale ? '' : locale);

    if (targetUrl == url || targetUrl + '/' == url) {
        return url;
    }

    if (baseUrl === '/') {
        return url?.replace(baseUrl, (targetUrl === '/' ? '' : targetUrl) + '/');
    }

    return url?.replace(baseUrl, targetUrl === '/' ? '' : targetUrl);
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

export function mapToObj(data: Map<string, any>) {
    const obj = Object.create({})

    let items = data.entries()
    for (const item of items) {
        obj[item[0]] = JSON.stringify(item[1])
    }
    return obj
}

export function parseMessages(data: any) {
    const obj = Object.create({})
    for (const k in data) {
        try {
            obj[k] = JSON.parse(data[k])
        } catch (error) {
            obj[k] = {}
            console.error(error)
        }
    }
    return obj
}

export const clientTranslate = (k: string, messages?: any) => {
    if(!window){
        console.log('I18nClient is only used on the client side')
        return ''
    }
    const w = (window as any)
    if (!w.I18nClient) {
        console.error('I18nClient not found', w.I18nClient)
        return ''
    }
    // parse locale
    const locales: string[] = w.I18nClient.locales;
    const tmp = window.location.pathname.split('/').filter(s => s != '');
    let locale = w.I18nClient.default
    for (const s of locales) {
        if (s === tmp[0]) {
            locale = s;
            break
        }
    }
    w.I18nClient.locale = locale
    // parse messages
    const obj = Object.create({})
    if (!messages) {
        for (const k in w.I18nClient.messages) {
            try {
                obj[k] = JSON.parse(w.I18nClient.messages[k])
            } catch (error) {
                obj[k] = {}
                console.error(error)
            }
        }
    }

    // translate
    const msgs = messages ? messages : obj;
    const msg = msgs[locale]
    if (!msg) {
        return ''
    }
    const ar = k.split('.');
    let o = null;
    for (const s of ar) {
        if (!o && msg) {
            o = Reflect.get(msg, s);
        } else if (o) {
            o = Reflect.get(o, s);
        }
    }
    return o ?? '';
}