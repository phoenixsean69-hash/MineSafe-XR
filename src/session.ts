import type { DrillPhase, ScenarioKind } from './types'
import { PHASES, SCENARIOS, getEvents } from './types'

export type ObservationKey = 'hazard' | 'route' | 'alternate'
export type SessionStatus = 'ready' | 'running' | 'paused' | 'complete'
export type DrillConfig = { trainee: string; area: string; personnel: number }
export type SessionEvent = {
  id: string
  elapsedMs: number
  phase: DrillPhase
  kind: 'phase' | 'observation' | 'control'
  title: string
  detail: string
}
export type DrillSession = {
  version: 1
  id: string
  scenario: ScenarioKind
  config: DrillConfig
  phase: DrillPhase
  status: SessionStatus
  createdAt: number
  elapsedMs: number
  resumedAt: number | null
  observations: Record<ObservationKey, number | null>
  events: SessionEvent[]
}

export const OBSERVATIONS: Record<ObservationKey, string> = {
  hazard: 'Hazard recognised', route: 'Unsafe route rejected', alternate: 'Alternate route selected',
}

export function newSession(scenario: ScenarioKind = 'fire', config?: DrillConfig, now = Date.now()): DrillSession {
  return {
    version: 1, id: `mxr-${now}-${Math.random().toString(36).slice(2, 9)}`,
    scenario, config: config ?? { trainee: 'Worker 017', area: SCENARIOS[scenario].subtitle, personnel: 1 },
    phase: 'idle', status: 'ready', createdAt: now, elapsedMs: 0, resumedAt: null,
    observations: { hazard: null, route: null, alternate: null }, events: [],
  }
}

export function elapsed(session: DrillSession, now = Date.now()): number {
  return session.elapsedMs + (session.status === 'running' && session.resumedAt !== null
    ? Math.max(0, now - session.resumedAt) : 0)
}

function append(session: DrillSession, kind: SessionEvent['kind'], title: string, detail: string, now: number): DrillSession {
  return { ...session, events: [...session.events, {
    id: `${session.id}-${session.events.length}`, elapsedMs: elapsed(session, now),
    phase: session.phase, kind, title, detail,
  }] }
}

function enterPhase(session: DrillSession, phase: DrillPhase, now: number): DrillSession {
  const event = getEvents(session.scenario).find(item => item.phase === phase)!
  const next = { ...session, phase }
  return append(next, 'phase', event.title, event.detail, now)
}

export function startOrPause(session: DrillSession, now = Date.now()): DrillSession {
  if (session.status === 'complete') return session
  if (session.status === 'ready') {
    return enterPhase({ ...session, status: 'running', resumedAt: now }, 'alarm', now)
  }
  if (session.status === 'running') {
    return append({ ...session, status: 'paused', elapsedMs: elapsed(session, now), resumedAt: null },
      'control', 'Drill paused', 'The active session clock is paused.', now)
  }
  return append({ ...session, status: 'running', resumedAt: now },
    'control', 'Drill resumed', 'The active session clock resumed.', now)
}

export function advanceSession(session: DrillSession, now = Date.now()): DrillSession {
  if (session.status !== 'running') return session
  const phase = PHASES[Math.min(PHASES.indexOf(session.phase) + 1, PHASES.length - 1)]
  const next = enterPhase(session, phase, now)
  return phase === 'complete' ? { ...next, status: 'complete', elapsedMs: elapsed(next, now), resumedAt: null } : next
}

export function endSession(session: DrillSession, now = Date.now()): DrillSession {
  if (session.status === 'ready' || session.status === 'complete') return session
  const next = enterPhase(session, 'complete', now)
  return { ...next, status: 'complete', elapsedMs: elapsed(next, now), resumedAt: null }
}

export function canObserve(session: DrillSession, key: ObservationKey): boolean {
  return session.status === 'running' && (key === 'hazard' || PHASES.indexOf(session.phase) >= 2)
}

export function observe(session: DrillSession, key: ObservationKey, checked: boolean, now = Date.now()): DrillSession {
  if (!canObserve(session, key)) return session
  if ((session.observations[key] !== null) === checked) return session
  const next = { ...session, observations: { ...session.observations, [key]: checked ? elapsed(session, now) : null } }
  return append(next, 'observation', OBSERVATIONS[key], checked
    ? 'Marked by the instructor during this drill.' : 'Instructor removed this observation.', now)
}

export function snapshot(session: DrillSession, now = Date.now()): DrillSession {
  return { ...session, elapsedMs: elapsed(session, now), resumedAt: null,
    status: session.status === 'running' ? 'paused' : session.status }
}

export function observationDelay(session: DrillSession): number | null {
  const alarm = session.events.find(event => event.kind === 'phase' && event.phase === 'alarm')
  return alarm && session.observations.hazard !== null
    ? Math.max(0, session.observations.hazard - alarm.elapsedMs) : null
}

export function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return 'Not recorded'
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isSession(value: unknown): value is DrillSession {
  if (!isObject(value) || value.version !== 1 || typeof value.id !== 'string' || !value.id
    || typeof value.scenario !== 'string' || !Object.prototype.hasOwnProperty.call(SCENARIOS, value.scenario)
    || !PHASES.includes(value.phase as DrillPhase)
    || !['ready', 'running', 'paused', 'complete'].includes(String(value.status))
    || !isDuration(value.createdAt) || !isDuration(value.elapsedMs)
    || (value.resumedAt !== null && !isDuration(value.resumedAt))
    || !isObject(value.config) || typeof value.config.trainee !== 'string'
    || typeof value.config.area !== 'string' || !Number.isInteger(value.config.personnel)
    || Number(value.config.personnel) < 1 || Number(value.config.personnel) > 50
    || !isObject(value.observations) || !Array.isArray(value.events) || value.events.length > 10000) return false
  if (!Object.keys(OBSERVATIONS).every(key => value.observations && isObject(value.observations)
    && (value.observations[key] === null || isDuration(value.observations[key])))) return false
  return value.events.every(event => isObject(event) && typeof event.id === 'string'
    && isDuration(event.elapsedMs) && PHASES.includes(event.phase as DrillPhase)
    && ['phase', 'observation', 'control'].includes(String(event.kind))
    && typeof event.title === 'string' && typeof event.detail === 'string')
}

const STORAGE_KEY = 'minesafe.workspace.v1'
export function readWorkspace(): { session: DrillSession; recent: DrillSession[] } {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (isObject(data) && isSession(data.session)) {
      const session = { ...data.session, resumedAt: null,
        status: data.session.status === 'running' ? 'paused' as const : data.session.status }
      return { session, recent: Array.isArray(data.recent) ? data.recent.filter(isSession).slice(0, 12) : [] }
    }
  } catch { /* Unavailable or damaged storage starts a fresh workspace. */ }
  return { session: newSession(), recent: [] }
}

export function saveWorkspace(session: DrillSession, recent: DrillSession[], now = Date.now()): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ session: snapshot(session, now), recent: recent.slice(0, 12) }))
    return true
  } catch { return false }
}
