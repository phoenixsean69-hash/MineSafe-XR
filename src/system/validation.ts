import { PHASES } from '../types'
import type { Incident, Scenario, Trainee, TrainingData, TrainingSession } from './types'
import { ACTION_NAMES, HAZARDS, NODES, OBSERVATION_NAMES } from './types'
import { copy, edgeBetween, scenarioErrors, sessionSnapshot } from './model'

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' must be an object.')
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, max = 1000, required = false): string {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw new Error('Check ' + label + '.')
  return value
}
function number(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Check ' + label + '.')
  return value
}
function bool(value: unknown, label: string) { if (typeof value !== 'boolean') throw new Error('Check ' + label + '.') }
function list(value: unknown, label: string, max = 10000): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Check the ' + label + ' list.')
  return value
}
function choice(value: unknown, values: readonly string[], label: string) {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error('Unknown ' + label + '.')
}
function timestamps(row: Record<string, unknown>) { number(row.createdAt, 'creation date', 0, 8640000000000000); number(row.updatedAt, 'update date', 0, 8640000000000000) }

export function validateScenario(value: unknown): Scenario {
  const row = object(value, 'Scenario')
  for (const key of ['id', 'code', 'title', 'area']) text(row[key], 'scenario ' + key, 180, true)
  for (const key of ['brief', 'objectives', 'instructorNotes']) text(row[key], 'scenario ' + key, 20000)
  choice(row.hazard, Object.keys(HAZARDS), 'hazard type'); choice(row.status, ['draft', 'ready', 'archived'], 'scenario state')
  number(row.version, 'scenario version', 1, 100000); bool(row.builtIn, 'scenario source'); timestamps(row)
  for (const key of ['routeLossSeconds', 'alternateSeconds', 'timeLimitSeconds', 'speed', 'mistakePenalty', 'normalAirflow', 'hazardAirflow', 'hazardVisibility']) number(row[key], key)
  text(row.startingNode, 'start waypoint', 100); text(row.refugeNode, 'refuge waypoint', 100)
  list(row.blockedEdges, 'closed route sections', 10).forEach(id => text(id, 'route section', 100))
  list(row.requiredActions, 'assessment actions', 4).forEach(key => choice(key, Object.keys(ACTION_NAMES), 'assessment action'))
  if (row.sourceIncident !== null) {
    const source = object(row.sourceIncident, 'Scenario source')
    for (const key of ['id', 'reference', 'title', 'occurredOn', 'lessons']) text(source[key], 'source ' + key, key === 'lessons' ? 20000 : 200)
  }
  const errors = scenarioErrors(row as unknown as Scenario)
  if (errors.length) throw new Error(errors.join(' '))
  return row as unknown as Scenario
}
export function validateIncident(value: unknown): Incident {
  const row = object(value, 'Incident')
  for (const key of ['id', 'reference', 'title', 'area']) text(row[key], 'incident ' + key, 180, true)
  text(row.description, 'incident description', 20000, true); text(row.lessons, 'lessons', 20000); text(row.source, 'source', 1000)
  const date = text(row.occurredOn, 'incident date', 10, true)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Choose a valid incident date.')
  choice(row.hazard, Object.keys(HAZARDS), 'incident hazard'); choice(row.category, ['Incident', 'Near miss', 'Hazard observation'], 'incident category')
  bool(row.reviewed, 'review status'); bool(row.archived, 'archive status'); timestamps(row)
  return row as unknown as Incident
}
export function validateTrainee(value: unknown): Trainee {
  const row = object(value, 'Trainee')
  text(row.id, 'trainee ID', 180, true); text(row.name, 'trainee name', 160, true)
  for (const key of ['employeeNumber', 'department', 'role']) text(row[key], 'trainee ' + key, 160)
  text(row.notes, 'trainee notes', 10000); bool(row.active, 'trainee status'); timestamps(row)
  return row as unknown as Trainee
}
export function validateSession(value: unknown): TrainingSession {
  const row = object(value, 'Drill record')
  if (row.schemaVersion !== 2) throw new Error('Unsupported drill record version.')
  text(row.id, 'drill ID', 180, true); validateScenario(row.scenario)
  const participants = list(row.participants, 'participants', 50)
  participants.forEach(value => {
    const p = object(value, 'Participant')
    for (const key of ['id', 'name', 'employeeNumber', 'department']) text(p[key], 'participant ' + key, 180, key === 'id' || key === 'name')
  })
  text(row.instructor, 'instructor', 160); text(row.notes, 'debrief notes', 20000)
  choice(row.status, ['ready', 'running', 'paused', 'complete'], 'drill status'); choice(row.phase, PHASES, 'drill phase')
  choice(row.outcome, ['In progress', 'Refuge reached', 'Ended early', 'Time limit reached', 'Earlier drill'], 'drill outcome')
  number(row.createdAt, 'drill date', 0, 8640000000000000); number(row.elapsedMs, 'drill duration', 0, 86400000)
  for (const key of ['startedAt', 'endedAt', 'resumedAt']) if (row[key] !== null) number(row[key], key, 0, 8640000000000000)
  number(row.mistakes, 'route attempts', 0, 100000); bool(row.autoEvents, 'automatic events')
  choice(row.node, NODES.map(node => node.id), 'waypoint')
  if (row.movement !== null) {
    const movement = object(row.movement, 'Movement')
    choice(movement.from, NODES.map(node => node.id), 'movement start'); choice(movement.to, NODES.map(node => node.id), 'movement destination')
    number(movement.startMs, 'movement time'); number(movement.endMs, 'movement end')
    if (Number(movement.endMs) <= Number(movement.startMs)) throw new Error('Invalid movement duration.')
    if (!edgeBetween(String(movement.from), String(movement.to))) throw new Error('Movement must follow connected waypoints.')
  }
  for (const [key, allowed] of [['decisions', Object.keys(ACTION_NAMES)], ['observations', Object.keys(OBSERVATION_NAMES)]] as const) {
    const values = object(row[key], key)
    allowed.forEach(action => { if (values[action] !== null) number(values[action], action, 0, Number(row.elapsedMs)) })
  }
  let previous = -1
  list(row.events, 'drill events', 20000).forEach(value => {
    const event = object(value, 'Drill event')
    text(event.id, 'event ID', 180, true); const at = number(event.atMs, 'event time', 0, Number(row.elapsedMs))
    if (at < previous) throw new Error('Drill event times must be in order.')
    previous = at
    choice(event.phase, PHASES, 'event phase'); choice(event.kind, ['phase', 'decision', 'movement', 'control', 'observation'], 'event type')
    for (const key of ['title', 'detail', 'actor']) text(event[key], 'event ' + key, 2000)
    if (event.success !== null) bool(event.success, 'event result')
    if (event.action !== undefined) choice(event.action, Object.keys(ACTION_NAMES), 'event action')
    if (event.node !== undefined) choice(event.node, NODES.map(node => node.id), 'event waypoint')
    if (event.observation !== undefined) choice(event.observation, Object.keys(OBSERVATION_NAMES), 'observation')
    if (event.checked !== undefined) bool(event.checked, 'observation state')
    if (event.movement !== undefined) {
      const m = object(event.movement, 'Movement event')
      choice(m.from, NODES.map(node => node.id), 'movement start'); choice(m.to, NODES.map(node => node.id), 'movement destination')
      number(m.startMs, 'movement start time'); number(m.endMs, 'movement end time')
      if (Number(m.endMs) <= Number(m.startMs)) throw new Error('Invalid recorded movement.')
      if (!edgeBetween(String(m.from), String(m.to))) throw new Error('Recorded movement must follow connected waypoints.')
    }
  })
  if (row.status === 'complete' && row.phase !== 'complete') throw new Error('The completed drill has an invalid phase.')
  if (row.outcome === 'Refuge reached' && row.node !== (row.scenario as Scenario).refugeNode) throw new Error('The refuge result does not match the recorded position.')
  if (row.outcome === 'Refuge reached' && (row.status !== 'complete' || (row.scenario as Scenario).requiredActions.some(action => (row.decisions as Record<string, unknown>)[action] === null))) throw new Error('The refuge result is missing required trainee actions.')
  if (row.earlierRecord === undefined) throw new Error('The drill source is missing.')
  return row as unknown as TrainingSession
}
export function validateData(value: unknown): TrainingData {
  const row = object(value, 'Workspace')
  if (row.schemaVersion !== 2) throw new Error('This backup uses an unsupported workspace version.')
  const scenarios = list(row.scenarios, 'scenarios', 2000).map(validateScenario)
  const incidents = list(row.incidents, 'incidents', 10000).map(validateIncident)
  const trainees = list(row.trainees, 'trainees', 10000).map(validateTrainee)
  const sessions = list(row.sessions, 'sessions', 10000).map(validateSession)
  for (const [label, records] of [['scenario', scenarios], ['incident', incidents], ['trainee', trainees], ['session', sessions]] as const) {
    if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Duplicate ' + label + ' IDs in the backup.')
  }
  const numbers = trainees.map(t => t.employeeNumber.trim().toLowerCase()).filter(Boolean)
  if (new Set(numbers).size !== numbers.length) throw new Error('Employee numbers must be unique.')
  if (row.activeSessionId !== null && (typeof row.activeSessionId !== 'string' || !sessions.some(s => s.id === row.activeSessionId))) throw new Error('The active drill reference is invalid.')
  const prefs = object(row.preferences, 'Preferences')
  text(prefs.instructor, 'instructor', 160); text(prefs.organisation, 'organisation', 200)
  for (const key of ['autoEvents', 'showRoutes', 'showLabels', 'showGrid', 'showWarnings']) bool(prefs[key], key)
  choice(prefs.viewStyle, ['wireframe', 'solid', 'rendered'], 'view style')
  return row as unknown as TrainingData
}
export function pausedData(data: TrainingData, now = Date.now()): TrainingData {
  return { ...data, sessions: data.sessions.map(s => s.status === 'running' ? sessionSnapshot(s, now) : s) }
}
export function parseBackup(text: string): TrainingData {
  if (text.length > 25 * 1024 * 1024) throw new Error('Use a backup smaller than 25 MB.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('The selected file is not valid JSON.') }
  const envelope = object(value, 'Backup')
  if (envelope.format !== 'minesafe.workspace.v2') throw new Error('Choose a MineSafe XR workspace backup.')
  return pausedData(validateData(envelope.data))
}
export function mergeData(current: TrainingData, incoming: TrainingData): { data: TrainingData; added: number; skipped: number } {
  const data = copy(current)
  let added = 0, skipped = 0
  for (const key of ['scenarios', 'incidents', 'trainees', 'sessions'] as const) {
    const known = new Set(data[key].map(row => row.id))
    for (const record of incoming[key]) {
      if (known.has(record.id)) { skipped++; continue }
      if (key === 'trainees') {
        const trainee = record as Trainee
        if (trainee.employeeNumber.trim() && data.trainees.some(t => t.employeeNumber.trim().toLowerCase() === trainee.employeeNumber.trim().toLowerCase())) { skipped++; continue }
      }
      ;(data[key] as { id: string }[]).push(copy(record)); known.add(record.id); added++
    }
  }
  if (!data.activeSessionId) data.activeSessionId = incoming.activeSessionId
  if (!data.preferences.instructor) data.preferences.instructor = incoming.preferences.instructor
  if (!data.preferences.organisation) data.preferences.organisation = incoming.preferences.organisation
  return { data: validateData(data), added, skipped }
}
