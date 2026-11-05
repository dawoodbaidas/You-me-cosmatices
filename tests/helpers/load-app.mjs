import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import ts from 'typescript'

const require = createRequire(import.meta.url)
export function modules(stubs = {}, environment = {}) {
  const loaded = new Map()
  const load = name => {
    if (name in stubs) return stubs[name]
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
    if (!name.startsWith('@/') && !name.startsWith('.') && !isAbsolute(name)) return require(name)
    let filename = name.startsWith('@/') ? resolve('src', name.slice(2)) : name
    if (filename.endsWith('.json')) return JSON.parse(readFileSync(filename, 'utf8'))
    if (!existsSync(filename)) filename += existsSync(filename + '.ts') ? '.ts' : '.tsx'
    if (loaded.has(filename)) return loaded.get(filename).exports
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const compiled = { exports: {} }
    loaded.set(filename, compiled)
    new Function('require', 'module', 'exports', 'process', source)(id => load(id.startsWith('.') ? resolve(dirname(filename), id) : id), compiled, compiled.exports, { env: environment })
    return compiled.exports
  }
  return load
}
