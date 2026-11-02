import { test } from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserTestEnvironment, createBrowserWorkspace, removeBrowserWorkspace } from './helpers/browser-workspace.mjs'

test('browser QA never copies or edits application env files and never inherits real database credentials', async () => {
  const project = await mkdtemp(join(tmpdir(), 'store-env-sentinel-'))
  await mkdir(join(project,'node_modules'))
  await mkdir(join(project,'src'))
  const sentinel = 'NEXT_PUBLIC_SUPABASE_URL=https://real-project.invalid\nNEXT_PUBLIC_SUPABASE_ANON_KEY=DO_NOT_REPLACE\n'
  await writeFile(join(project,'.env.local'),sentinel)
  await writeFile(join(project,'src','.env.local'),sentinel)
  await writeFile(join(project,'src','marker.txt'),'source')
  const workspace = await createBrowserWorkspace(project)
  try {
    await assert.rejects(access(join(workspace,'.env.local')))
    await assert.rejects(access(join(workspace,'src','.env.local')))
    assert.equal(await readFile(join(project,'.env.local'),'utf8'),sentinel)
    assert.equal(await readFile(join(workspace,'src','marker.txt'),'utf8'),'source')
    const environment = browserTestEnvironment('http://127.0.0.1:12345',{NEXT_PUBLIC_SUPABASE_URL:'https://real-project.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'real-key',SUPABASE_SERVICE_ROLE_KEY:'never-inherit',PATH:'system-path'})
    assert.equal(environment.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:12345')
    assert.equal(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,'isolated-browser-qa')
    assert.equal(environment.SUPABASE_SERVICE_ROLE_KEY,undefined)
    assert.throws(()=>browserTestEnvironment('https://real-project.invalid'))
  } finally { await removeBrowserWorkspace(workspace) }
  assert.equal(await readFile(join(project,'.env.local'),'utf8'),sentinel)
})
