import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLocalServer } from '../scripts/start-local.mjs'

test('local launcher serves only the app build and refuses writes and malformed paths', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'minesafe-server-'))
  writeFileSync(join(folder, 'index.html'), '<h1>MineSafe XR</h1>')
  writeFileSync(join(folder, 'app.js'), 'export const app = true')
  const server = createLocalServer(folder)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = 'http://127.0.0.1:' + server.address().port
  try {
    const home = await fetch(base)
    assert.equal(home.status, 200); assert.ok((await home.text()).includes('MineSafe XR'))
    assert.match((await fetch(base + '/app.js')).headers.get('content-type'), /javascript/)
    assert.equal((await fetch(base + '/app.js', { method: 'HEAD' })).headers.get('content-length'), '23')
    assert.equal((await fetch(base + '/app.js', { method: 'POST' })).status, 405)
    assert.equal((await fetch(base + '/%')).status, 400)
    assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403)
    assert.equal((await fetch(base + '/%5c..%5cpackage.json')).status, 400)
    assert.equal((await fetch(base + '/missing')).status, 404)
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(folder, { recursive: true, force: true }) }
})
