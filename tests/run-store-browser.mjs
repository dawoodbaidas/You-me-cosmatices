// Manual browser QA runs a separate application copy. Never edits the real app's
// .env files, Next build output, generated types or configured database.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { startStoreBrowserDatabase } from './helpers/store-browser-server.mjs'
import { browserTestEnvironment, createBrowserWorkspace, removeBrowserWorkspace } from './helpers/browser-workspace.mjs'

const project = resolve(import.meta.dirname, '..')
const fixture = await startStoreBrowserDatabase()
const directory = await createBrowserWorkspace(project)
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const production = process.argv.includes('--production')
if (production) {
  const build = spawn(process.execPath, [resolve(project, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], {
    cwd: directory, env: { ...browserTestEnvironment(fixture.url), NODE_ENV: 'production' }, stdio: 'inherit', windowsHide: true,
  })
  const [code] = await once(build, 'exit')
  if (code !== 0) { await fixture.close(); await removeBrowserWorkspace(directory); process.exit(code ?? 1) }
}
const child = spawn(process.execPath, [resolve(project, 'node_modules/next/dist/bin/next'), ...(production ? ['start'] : ['dev', '--webpack']), '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: directory, env: { ...browserTestEnvironment(fixture.url), NODE_ENV: production ? 'production' : 'development' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
})
child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)
console.log(`Isolated browser QA: http://127.0.0.1:${port} (not the real storefront)`)
console.log(`Isolated QA database control: ${fixture.url}`)
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  if (child.exitCode === null) {
    if (process.platform === 'win32') {
      const kill = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
      await once(kill, 'exit')
    } else child.kill('SIGTERM')
    if (child.exitCode === null) await once(child, 'exit')
  }
  await fixture.close()
  try { await removeBrowserWorkspace(directory) } catch { console.log('QA stopped; its dedicated temporary workspace was retained.') }
}
process.on('SIGINT', () => { void stop().then(() => process.exit(0)) })
process.on('SIGTERM', () => { void stop().then(() => process.exit(0)) })
child.on('exit', () => { if (!stopping) void stop().then(() => { process.exitCode = child.exitCode ?? 1 }) })
