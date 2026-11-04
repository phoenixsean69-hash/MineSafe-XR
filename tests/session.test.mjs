import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const directory = mkdtempSync(join(tmpdir(), 'minesafe-tests-'))
writeFileSync(join(directory, 'package.json'), '{"type":"commonjs"}')
for (const name of ['types', 'session']) {
  const source = readFileSync(new URL('../src/' + name + '.ts', import.meta.url), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  writeFileSync(join(directory, name + '.js'), output)
}
const m = require(join(directory, 'session.js'))
after(() => rmSync(directory, { recursive: true, force: true }))

test('active time excludes a long pause and freezes after completion', () => {
  let s = m.startOrPause(m.newSession('fire', undefined, 0), 1000)
  assert.equal(m.elapsed(s, 3500), 2500)
  s = m.startOrPause(s, 6000)
  assert.equal(m.elapsed(s, 100000), 5000)
  s = m.startOrPause(s, 110000)
  s = m.endSession(s, 112000)
  assert.equal(m.elapsed(s, 999999), 7000)
})

test('finishing the entire scenario never invents a trainee observation', () => {
  let s = m.startOrPause(m.newSession('fire', undefined, 0), 1000)
  for (const time of [4000, 7000, 10000]) s = m.advanceSession(s, time)
  assert.equal(s.status, 'complete')
  assert.deepEqual(s.observations, { hazard: null, route: null, alternate: null })
  assert.equal(m.observationDelay(s), null)
})

test('early end records only reached phases', () => {
  let s = m.startOrPause(m.newSession('rockfall', undefined, 0), 0)
  s = m.endSession(s, 1700)
  assert.deepEqual(s.events.map(event => event.phase), ['alarm', 'complete'])
  assert.equal(m.elapsed(s, 99999), 1700)
})

test('observations require a running drill and the relevant hazard state', () => {
  const ready = m.newSession('fire', undefined, 0)
  assert.deepEqual(m.observe(ready, 'hazard', true, 100), ready)
  let s = m.startOrPause(ready, 1000)
  assert.equal(m.observe(s, 'route', true, 2000).observations.route, null)
  s = m.observe(s, 'hazard', true, 2500)
  assert.equal(s.observations.hazard, 1500)
  assert.equal(m.observationDelay(s), 1500)
  s = m.startOrPause(s, 3000)
  assert.deepEqual(m.observe(s, 'alternate', true, 3500), s)
})

test('an instructor correction clears the current observation and preserves its audit trail', () => {
  let s = m.startOrPause(m.newSession('ventilation', undefined, 0), 0)
  s = m.observe(s, 'hazard', true, 1200)
  const count = s.events.length
  assert.equal(m.observe(s, 'hazard', true, 1300).events.length, count)
  s = m.observe(s, 'hazard', false, 1600)
  assert.equal(s.observations.hazard, null)
  assert.equal(s.events.filter(event => event.kind === 'observation').length, 2)
  assert.match(s.events.at(-1).detail, /removed/)
})

test('a new scenario has a new record with no previous actions', () => {
  let s = m.startOrPause(m.newSession('fire', undefined, 0), 0)
  s = m.observe(s, 'hazard', true, 1000)
  const fresh = m.newSession('rockfall', undefined, 2000)
  assert.notEqual(fresh.id, s.id)
  assert.equal(fresh.events.length, 0)
  assert.equal(fresh.elapsedMs, 0)
  assert.equal(fresh.config.area, 'East Access - Level 3')
})

test('saving a running drill restores it paused without adding time away', () => {
  let data = ''
  globalThis.localStorage = { setItem: (_key, value) => { data = value }, getItem: () => data }
  const s = m.startOrPause(m.newSession('fire', undefined, 0), 1000)
  assert.equal(m.saveWorkspace(s, [], 6500), true)
  const restored = m.readWorkspace().session
  assert.equal(restored.status, 'paused')
  assert.equal(m.elapsed(restored, 999999), 5500)
})

test('broken storage is recoverable and storage failure is reported', () => {
  globalThis.localStorage = { getItem: () => '{broken', setItem: () => { throw new Error('quota') } }
  assert.equal(m.readWorkspace().session.status, 'ready')
  assert.equal(m.saveWorkspace(m.newSession(), []), false)
})

test('malformed saved data and invalid scenario names are rejected', () => {
  const fresh = m.newSession('fire', undefined, 0)
  assert.equal(m.isSession(fresh), true)
  assert.equal(m.isSession({ ...fresh, observations: { hazard: 'yes' } }), false)
  assert.equal(m.isSession({ ...fresh, scenario: '__proto__' }), false)
  assert.equal(m.isSession({ ...fresh, elapsedMs: -1 }), false)
})

test('durations continue correctly beyond one minute and absent observations stay absent', () => {
  assert.equal(m.formatDuration(125000), '02:05')
  assert.equal(m.formatDuration(null), 'Not recorded')
})
