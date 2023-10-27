interface ScriptSource {
    src: string
    cur: string
}

interface SourceFile {
    src: string
    server: ScriptSource
    scripts: ScriptSource[]
    cur: string
}
interface AstroRoute {
    pattern: string
    entryPoint: string
    src: string
    locale: string
}