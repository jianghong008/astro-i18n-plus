interface ImportMeta {
    env: {
        BASE_URL: string
    }
}
interface I18nClient {
    readonly messages: Map<string, any>
    readonly locales: string[]
    readonly default: string
    readonly locale: string
    readonly t:(k:string)=>string
}
interface Window {
    readonly I18nClient: I18nClient
}