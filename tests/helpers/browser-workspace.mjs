import { cp, lstat, mkdtemp, realpath, rm, symlink, unlink } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'

const PREFIX = 'you-me-browser-qa-'
const FILES = ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs']

export function browserTestEnvironment(databaseUrl, system = process.env) {
  const url = new URL(databaseUrl)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Browser QA requires its own loopback database')
  const environment = {}
  for (const name of ['Path', 'PATH', 'SystemRoot', 'WINDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'COMSPEC', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE']) {
    if (system[name]) environment[name] = system[name]
  }
  return { ...environment, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: url.origin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-browser-qa', PREVIEW_WITHOUT_SUPABASE: 'false' }
}

export async function createBrowserWorkspace(projectDirectory) {
  const directory = await mkdtemp(join(tmpdir(), PREFIX))
  for (const name of FILES) {
    try {
      await lstat(join(projectDirectory, name))
    } catch { continue }
    await cp(join(projectDirectory, name), join(directory, name), { recursive: true, filter: async source => {
      if (basename(source).startsWith('.env')) return false
      return !(await lstat(source)).isSymbolicLink()
    } })
  }
  await symlink(join(projectDirectory, 'node_modules'), join(directory, 'node_modules'), 'junction')
  return directory
}

export async function removeBrowserWorkspace(directory) {
  const root = await realpath(tmpdir())
  const target = await realpath(directory)
  const child = relative(root, target)
  // Compare inverted-case and 8.3-short-name (Windows) path forms through
  // realpath on both sides instead of a raw resolve() string equality.
  const resolvedReal = await realpath(resolve(directory))
  if (!basename(target).startsWith(PREFIX) || child.startsWith(`..${sep}`) || child === '..' || resolvedReal !== target) throw new Error('Refusing to clean outside the dedicated QA workspace')
  // Unlink the junction itself; never recursively traverse shared dependencies.
  const modules = join(target, 'node_modules')
  if (!(await lstat(modules)).isSymbolicLink()) throw new Error('Unexpected QA dependencies; leaving workspace intact')
  await unlink(modules)
  await rm(target, { recursive: true, force: true })
}
