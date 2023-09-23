
import path from 'path';
import fs from 'node:fs/promises';
import { parse } from '@typescript-eslint/typescript-estree';

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
export class AstroLocaleParse {
    static SetLocaleMethod = 'setLocale'
    static BaseDir = '';
    private _tempDir = '';
    private _filePath: string;
    private _locale: string;
    public source: SourceFile = {
        src: '',
        server: {
            src: '',
            cur: ''
        },
        scripts: [],
        cur: ''
    }
    constructor(locale: string, _tempDir: string, f: string) {
        this._locale = locale;
        this._tempDir = _tempDir;
        this._filePath = f;
    }
    get PagesDir() {
        return path.join(AstroLocaleParse.BaseDir, './src/pages')
    }
    async loadSource() {
        const ctx: string = await fs.readFile(this._filePath, { encoding: 'utf8' });
        const reg1 = /---[\d\D]*---/i
        const serverScript = ctx.match(reg1)?.[0]

        // <script\b[^<]*(?:(?!</script>)<[^<]*)*<\/script>
        let reg2 = /<script\b[^<]*<\/script>/gi
        const scripts: ScriptSource[] = []
        ctx.match(reg2)?.forEach(s => {
            scripts.push({
                src: s,
                cur: ''
            })
        })
        this.source = {
            src: ctx,
            server: {
                src: serverScript ? serverScript : '',
                cur: ''
            },
            scripts,
            cur: ''
        }
    }
    isAbsolute(src: string) {
        return /^[\.\/].*/.test(src)
    }
    reImportFile(lines: string[], source: any) {
        const absolutePath = path.join(path.dirname(this._filePath), source.value);
        const relativePath = path.relative(this._tempDir, absolutePath).replace(/\\/g, '/');
        lines[source.loc.start.line - 1] = lines[source.loc.start.line - 1]?.replace(source.value, relativePath);
    }
    setLocale(lines: string[], index: number, arg: string) {
        
        lines[index - 1] = lines[index - 1].replace(`${AstroLocaleParse.SetLocaleMethod}('${arg}')`, `${AstroLocaleParse.SetLocaleMethod}('${this._locale}')`)
    }
    resolveModule(code: string) {
        const ast = parse(code, {
            loc: true,
            range: true,
        });
        const lines = code.split('\n');
        for (const b of ast.body) {
            if (b.type === 'ImportDeclaration' && this.isAbsolute(b.source.value)) {
                this.reImportFile(lines, b.source);
            } else if (b.type === 'ExpressionStatement' && b.expression.type === 'CallExpression' && (b.expression.callee as any).name === AstroLocaleParse.SetLocaleMethod) {
                this.setLocale(lines, b.expression.callee.loc.start.line, (b.expression.arguments?.[0] as any).value);
            }

        }

        return lines.join('\n');
    }
    async parseModules() {
        // parse
        await this.loadSource()
        // sever
        const server = this.resolveModule(this.source.server.src.replaceAll('---', ''));
        this.source.server.cur = `---${server}---`;
        this.source.cur = this.source.src.replace(this.source.server.src, this.source.server.cur)
        // scripts 
        for (const index in this.source.scripts) {
            this.source.scripts[index].cur = '<script>' + this.resolveModule(this.source.scripts[index].src.replaceAll(/<\/?script>/gi, '')) + '</script>';
            this.source.cur = this.source.cur.replace(this.source.scripts[index].src, this.source.scripts[index].cur)
        }
    }
}
