/// <reference types="astro/client" />

interface Window {
    I18nClient:{
        messages: Map<string, any>
        locales: string[]
        default: string
        locale: string
        t:(k:string)=>string
    }
}