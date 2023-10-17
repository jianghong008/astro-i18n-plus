interface ImportMeta {
    env: {
        BASE_URL: string
    }
}

interface I18nClient {
    messages: Map<string, any>
    locales: string[]
    default: string
    locale: string
}

interface Window {
    I18nClient:I18nClient
}