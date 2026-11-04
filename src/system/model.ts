import type { DrillPhase, ScenarioKind } from '../types'
import { PHASES } from '../types'
import type { ActionKey, Incident, Movement, ObservationKey, Participant, Point, Scenario, TrainingData, TrainingEvent, TrainingSession } from './types'
import { ACTION_NAMES, EDGES, HAZARDS, NODES, OBSERVATION_NAMES } from './types'

export function uid(prefix: string): string {
  return prefix + '-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))
}
export function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
export function makeScenario(hazard: ScenarioKind = 'fire', now = Date.now()): Scenario {
  return {
    id: uid('scenario'), code: 'MXR-' + now.toString(36).slice(-6).toUpperCase(), title: HAZARDS[hazard] + ' drill',
    area: hazard === 'fire' ? 'North Decline - Level 4' : hazard === 'rockfall' ? 'East Access - Level 3' : 'Ventilation District B',
    hazard, brief: 'Identify the hazard, raise the alarm, reject the withdrawn route and move to Refuge Chamber 2.',
    objectives: 'Recognise the changing conditions and make an appropriate evacuation decision in the training layout.',
    instructorNotes: '', status: 'draft', version: 1, builtIn: false, sourceIncident: null,
    routeLossSeconds: 8, alternateSeconds: 16, timeLimitSeconds: 300, speed: 2,
    startingNode: 'work', refugeNode: 'refuge', blockedEdges: ['route-a1', 'route-a2'],
    requiredActions: ['acknowledge', 'report', 'reject', 'refuge'], mistakePenalty: 10,
    normalAirflow: 2.8, hazardAirflow: hazard === 'ventilation' ? 0.9 : 1.7,
    hazardVisibility: hazard === 'fire' ? 41 : 78, createdAt: now, updatedAt: now,
  }
}
export function initialData(): TrainingData {
  return {
    schemaVersion: 2, scenarios: (['fire', 'rockfall', 'ventilation'] as ScenarioKind[]).map((kind, index) => ({
      ...makeScenario(kind, 0), id: 'builtin-' + kind, code: 'MXR-0' + (index + 1), status: 'ready', builtIn: true,
    })), incidents: [], trainees: [], sessions: [], activeSessionId: null,
    preferences: { instructor: '', organisation: '', autoEvents: false, showRoutes: true,
      showLabels: true, showGrid: true, showWarnings: true, viewStyle: 'solid' },
  }
}
export function scenarioFromIncident(incident: Incident, now = Date.now()): Scenario {
  return { ...makeScenario(incident.hazard, now), title: incident.title.slice(0, 172) + ' - drill', area: incident.area,
    brief: incident.description, instructorNotes: incident.lessons,
    objectives: incident.lessons || 'Practise the decisions described in the incident record.',
    sourceIncident: { id: incident.id, reference: incident.reference, title: incident.title,
      occurredOn: incident.occurredOn, lessons: incident.lessons } }
}
export function scenarioErrors(s: Scenario): string[] {
  const errors: string[] = []
  if (!s.code.trim() || s.code.length > 180) errors.push('Enter a scenario code of up to 180 characters.')
  if ([s.title, s.area].some(value => value.length > 180)) errors.push('Keep the title and mine area within 180 characters.')
  if ([s.brief, s.objectives, s.instructorNotes].some(value => value.length > 20000)) errors.push('Keep each scenario text field within 20,000 characters.')
  if (!s.title.trim()) errors.push('Enter a scenario title.')
  if (!s.area.trim()) errors.push('Enter a mine area.')
  if (!s.brief.trim()) errors.push('Add a training brief.')
  if (!s.objectives.trim()) errors.push('Add a learning objective.')
  if (!NODES.some(node => node.id === s.startingNode) || s.startingNode === s.refugeNode) errors.push('Choose a starting point outside the refuge.')
  if (s.refugeNode !== 'refuge') errors.push('The training layout uses Refuge Chamber 2.')
  if (!s.blockedEdges.length || s.blockedEdges.some(id => !EDGES.some(edge => edge.id === id))) errors.push('Select at least one valid route section to withdraw.')
  if (s.blockedEdges.some(id => EDGES.find(edge => edge.id === id)?.route !== 'primary')) errors.push('Keep the alternate refuge route open in this layout.')
  const reachable = new Set([s.startingNode])
  for (let count = 0; count < NODES.length; count++) {
    for (const edge of EDGES) {
      if (s.blockedEdges.includes(edge.id)) continue
      if (reachable.has(edge.from)) reachable.add(edge.to)
      if (reachable.has(edge.to)) reachable.add(edge.from)
    }
  }
  if (!reachable.has(s.refugeNode)) errors.push('Choose a starting point with a connected path to the refuge after route withdrawal.')
  if (!Number.isFinite(s.routeLossSeconds) || s.routeLossSeconds < 1 || s.routeLossSeconds > 600) errors.push('Route withdrawal must be between 1 and 600 seconds.')
  if (!Number.isFinite(s.alternateSeconds) || s.alternateSeconds < s.routeLossSeconds || s.alternateSeconds > 900) errors.push('Alternate-route introduction must follow route withdrawal.')
  if (!Number.isFinite(s.timeLimitSeconds) || s.timeLimitSeconds < Math.max(15, s.alternateSeconds) || s.timeLimitSeconds > 3600) errors.push('Use a time limit after the last event, up to 60 minutes.')
  if (s.speed < 0.5 || s.speed > 4 || !Number.isFinite(s.speed)) errors.push('Movement speed must be 0.5 to 4 scene metres per second.')
  if (!s.requiredActions.includes('refuge') || !s.requiredActions.includes('acknowledge')) errors.push('Include hazard identification and refuge arrival in the assessment.')
  if (new Set(s.requiredActions).size !== s.requiredActions.length || s.requiredActions.some(key => !(key in ACTION_NAMES))) errors.push('Choose valid assessment actions without duplicates.')
  if (!Number.isFinite(s.mistakePenalty) || s.mistakePenalty < 0 || s.mistakePenalty > 30) errors.push('The mistake penalty must be between 0 and 30 points.')
  if (![s.normalAirflow, s.hazardAirflow].every(n => Number.isFinite(n) && n >= 0 && n <= 20) || s.hazardVisibility < 0 || s.hazardVisibility > 100 || !Number.isFinite(s.hazardVisibility)) errors.push('Check the simulated airflow and visibility values.')
  return errors
}
export function newTraining(scenario: Scenario, participants: Participant[], instructor: string, autoEvents: boolean, now = Date.now()): TrainingSession {
  return { schemaVersion: 2, id: uid('drill'), scenario: copy(scenario), participants: copy(participants), instructor,
    status: 'ready', phase: 'idle', createdAt: now, startedAt: null, endedAt: null, elapsedMs: 0, resumedAt: null,
    autoEvents, node: scenario.startingNode, movement: null,
    decisions: { acknowledge: null, report: null, reject: null, refuge: null },
    observations: { hazard: null, route: null, alternate: null }, mistakes: 0,
    outcome: 'In progress', notes: '', events: [], earlierRecord: null }
}
export function activeTime(s: TrainingSession, now = Date.now()): number {
  return s.elapsedMs + (s.status === 'running' && s.resumedAt !== null ? Math.max(0, now - s.resumedAt) : 0)
}
export function sessionSnapshot(s: TrainingSession, now = Date.now()): TrainingSession {
  return { ...s, elapsedMs: activeTime(s, now), resumedAt: null, status: s.status === 'running' ? 'paused' : s.status }
}
function log(s: TrainingSession, kind: TrainingEvent['kind'], title: string, detail: string, now: number,
  extra: Partial<TrainingEvent> = {}): TrainingSession {
  return { ...s, events: [...s.events, { id: uid('event'), atMs: activeTime(s, now), phase: s.phase,
    kind, title, detail, actor: kind === 'decision' || kind === 'movement' ? 'Trainee input' : 'Instructor / scenario',
    success: null, ...extra }] }
}
export function startTraining(s: TrainingSession, now = Date.now()): TrainingSession {
  if (s.status === 'complete' || s.earlierRecord !== null) return s
  if (s.status === 'ready') {
    if (!s.participants.length || !s.instructor.trim() || s.scenario.status !== 'ready' || scenarioErrors(s.scenario).length) return s
    return log({ ...s, status: 'running', phase: 'alarm', startedAt: now, resumedAt: now }, 'phase',
      HAZARDS[s.scenario.hazard] + ' introduced', 'The training hazard is active.', now)
  }
  if (s.status === 'paused') return log({ ...s, status: 'running', resumedAt: now }, 'control', 'Drill resumed', 'Active timing resumed.', now)
  return pauseTraining(s, now)
}
export function pauseTraining(original: TrainingSession, now = Date.now()): TrainingSession {
  const s = tickTraining(original, now)
  return s.status !== 'running' ? s : log({ ...s, elapsedMs: activeTime(s, now), resumedAt: null, status: 'paused' },
    'control', 'Drill paused', 'The active clock and trainee movement are paused.', now)
}
export function finishTraining(s: TrainingSession, outcome: TrainingSession['outcome'], now = Date.now()): TrainingSession {
  if (s.status === 'ready' || s.status === 'complete') return s
  const ended = { ...s, elapsedMs: activeTime(s, now), resumedAt: null, status: 'complete' as const,
    phase: 'complete' as const, endedAt: now, outcome, movement: null }
  return log(ended, 'control', 'Exercise ended', outcome, now, { node: s.node })
}
function completeIfReady(s: TrainingSession, now: number): TrainingSession {
  return s.node === s.scenario.refugeNode && s.scenario.requiredActions.every(action => s.decisions[action] !== null)
    ? finishTraining(s, 'Refuge reached', now) : s
}
export function nextPhase(s: TrainingSession, now = Date.now()): TrainingSession {
  if (s.status !== 'running' || s.phase === 'reroute' || s.phase === 'complete') return s
  const phase: DrillPhase = s.phase === 'alarm' ? 'blocked' : 'reroute'
  let next = log({ ...s, phase }, 'phase', phase === 'blocked' ? 'Route A withdrawn' : 'Alternate route introduced',
    phase === 'blocked' ? 'The configured primary route sections are closed in this drill.' : 'The alternate refuge route is available for review.', now)
  if (next.movement && isBlocked(next, edgeBetween(next.movement.from, next.movement.to)!.id)) {
    next = log({ ...next, movement: null }, 'movement', 'Movement stopped at route withdrawal',
      'Returned to the last reached waypoint; the newly closed section was not crossed.', now, { node: next.node })
  }
  return next
}
export function takeAction(original: TrainingSession, action: ActionKey, now = Date.now()): TrainingSession {
  const s = tickTraining(original, now)
  if (s.status !== 'running' || action === 'refuge' || s.decisions[action] !== null) return s
  if (action === 'reject' && PHASES.indexOf(s.phase) < 2) return log(s, 'decision', 'Route rejection not recorded',
    'The primary route has not yet been withdrawn in this scenario.', now, { action, success: false })
  const next = { ...s, decisions: { ...s.decisions, [action]: activeTime(s, now) } }
  return completeIfReady(log(next, 'decision', ACTION_NAMES[action], 'Recorded from the trainee action control.', now, { action, success: true }), now)
}
export function recordObservation(s: TrainingSession, key: ObservationKey, checked: boolean, now = Date.now()): TrainingSession {
  if (s.status !== 'running' || (s.observations[key] !== null) === checked) return s
  return log({ ...s, observations: { ...s.observations, [key]: checked ? activeTime(s, now) : null } },
    'observation', OBSERVATION_NAMES[key], checked ? 'Marked by the instructor.' : 'Instructor removed the observation.', now,
    { observation: key, checked, actor: s.instructor })
}
export function neighbours(node: string): string[] {
  return EDGES.filter(edge => edge.from === node || edge.to === node).map(edge => edge.from === node ? edge.to : edge.from)
}
export function edgeBetween(from: string, to: string) {
  return EDGES.find(edge => edge.from === from && edge.to === to || edge.from === to && edge.to === from)
}
export function isBlocked(s: TrainingSession, edgeId: string): boolean {
  return PHASES.indexOf(s.phase) >= 2 && s.scenario.blockedEdges.includes(edgeId)
}
export function nodePoint(id: string): Point { return NODES.find(node => node.id === id)?.position ?? NODES[0].position }
export function sceneRoutes(scenario: Scenario, phase: DrillPhase) {
  return EDGES.map(edge => ({ id: edge.id, from: nodePoint(edge.from), to: nodePoint(edge.to),
    alternate: edge.route === 'alternate', blocked: PHASES.indexOf(phase) >= 2 && scenario.blockedEdges.includes(edge.id) }))
}
export function interpolate(movement: Movement, time: number): Point {
  const a = nodePoint(movement.from), b = nodePoint(movement.to)
  const ratio = Math.max(0, Math.min(1, (time - movement.startMs) / (movement.endMs - movement.startMs)))
  return a.map((n, index) => n + (b[index] - n) * ratio) as Point
}
export function playerPosition(s: TrainingSession, now = Date.now()): Point {
  return s.movement ? interpolate(s.movement, activeTime(s, now)) : nodePoint(s.node)
}
export function moveTrainee(original: TrainingSession, to: string, now = Date.now()): TrainingSession {
  const s = tickTraining(original, now)
  if (s.status !== 'running' || s.movement || !neighbours(s.node).includes(to)) return s
  const edge = edgeBetween(s.node, to)!
  if (isBlocked(s, edge.id)) return log({ ...s, mistakes: s.mistakes + 1 }, 'decision', 'Withdrawn route attempted',
    'Movement was stopped because this route section is closed in the scenario.', now, { success: false, node: s.node })
  const fromPoint = nodePoint(s.node), toPoint = nodePoint(to)
  const distance = Math.hypot(...fromPoint.map((n, index) => n - toPoint[index]))
  const startMs = activeTime(s, now)
  const movement = { from: s.node, to, startMs, endMs: startMs + distance / s.scenario.speed * 1000 }
  return log({ ...s, movement }, 'movement', 'Moving to ' + NODES.find(node => node.id === to)!.name,
    'Travel started through the connected training layout.', now, { movement, node: s.node })
}
export function tickTraining(original: TrainingSession, now = Date.now()): TrainingSession {
  if (original.status !== 'running') return original
  let s = original
  const time = activeTime(original, now)
  // Process due events in their active-time order, even after a throttled timer.
  for (let count = 0; count < 8 && s.status === 'running'; count++) {
    const due: { type: 'phase' | 'arrival' | 'limit'; at: number; priority: number }[] = [
      { type: 'limit', at: s.scenario.timeLimitSeconds * 1000, priority: 2 },
    ]
    if (s.autoEvents && s.phase === 'alarm') due.push({ type: 'phase', at: s.scenario.routeLossSeconds * 1000, priority: 0 })
    if (s.autoEvents && s.phase === 'blocked') due.push({ type: 'phase', at: s.scenario.alternateSeconds * 1000, priority: 0 })
    if (s.movement) due.push({ type: 'arrival', at: s.movement.endMs, priority: 1 })
    due.sort((a, b) => a.at - b.at || a.priority - b.priority)
    const event = due[0]
    const at = Math.max(event.at, s.elapsedMs, s.events[s.events.length - 1]?.atMs ?? 0)
    if (at > time) break
    const eventNow = s.resumedAt! + at - s.elapsedMs
    if (event.type === 'limit') { s = finishTraining(s, 'Time limit reached', eventNow); break }
    if (event.type === 'phase') { s = nextPhase(s, eventNow); continue }
    if (!s.movement) break
    const target = s.movement.to
    s = log({ ...s, node: target, movement: null }, 'movement', 'Reached ' + NODES.find(node => node.id === target)!.name,
      'Waypoint arrival recorded.', eventNow, { node: target, success: true })
    if (target === s.scenario.refugeNode && s.decisions.refuge === null) {
      s = log({ ...s, decisions: { ...s.decisions, refuge: at } }, 'decision', ACTION_NAMES.refuge,
        'The trainee arrived at the configured refuge waypoint.', eventNow, { action: 'refuge', node: target, success: true })
    }
    s = completeIfReady(s, eventNow)
  }
  return s
}
export function drillScore(s: TrainingSession): number | null {
  if (s.earlierRecord !== null) return null
  const count = s.scenario.requiredActions.filter(action => s.decisions[action] !== null).length
  return Math.max(0, Math.round(count / Math.max(1, s.scenario.requiredActions.length) * 100 - s.mistakes * s.scenario.mistakePenalty))
}
export function replayState(s: TrainingSession, time: number): { phase: DrillPhase; position: Point; node: string } {
  if (time < 0) return { phase: 'idle', position: nodePoint(s.scenario.startingNode), node: s.scenario.startingNode }
  const at = Math.max(0, Math.min(time, s.elapsedMs))
  let phase: DrillPhase = 'idle', node = s.scenario.startingNode, movement: Movement | null = null
  for (const event of s.events) {
    if (event.atMs > at) break
    if (event.kind === 'phase') phase = event.phase
    if (event.node) { node = event.node; movement = null }
    if (event.movement) movement = event.movement
  }
  return { phase, node, position: movement ? interpolate(movement, at) : nodePoint(node) }
}
export function duration(ms: number | null): string {
  if (ms === null) return 'Not recorded'
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
