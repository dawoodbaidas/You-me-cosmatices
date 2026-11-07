import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
const label = process.argv[2] ?? 'before'
if (!/^[a-z-]+$/.test(label)) throw new Error('Invalid label')
mkdirSync('artifacts/data-performance', { recursive: true })
const child = spawn(process.execPath, ['--import', new URL('./data-performance-trace.mjs', import.meta.url).href, 'node_modules/next/dist/bin/next', 'start', '--port', process.argv[3] ?? '3012'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, DATA_TRACE_FILE: resolve(`artifacts/data-performance/${label}-upstream.jsonl`) },
})
process.on('SIGINT', () => child.kill())
child.on('exit', code => { process.exitCode = code ?? 1 })
