import type { DrillPhase, ScenarioKind } from '../types'

export type Page = 'Drill' | 'Scenario Setup' | 'Debrief' | 'Scenario Library' | 'Incidents' | 'Trainees' | 'Reports' | 'Settings'
export type Point = [number, number, number]
export type ActionKey = 'acknowledge' | 'report' | 'reject' | 'refuge'
export type ObservationKey = 'hazard' | 'route' | 'alternate'
export type RecordStatus = 'draft' | 'ready' | 'archived'

export type Incident = {
  id: string; reference: string; title: string; occurredOn: string; area: string
  hazard: ScenarioKind; category: 'Incident' | 'Near miss' | 'Hazard observation'
  description: string; lessons: string; source: string; reviewed: boolean
  createdAt: number; updatedAt: number; archived: boolean
}
export type Trainee = {
  id: string; name: string; employeeNumber: string; department: string; role: string
  notes: string; active: boolean; createdAt: number; updatedAt: number
}
export type Participant = Pick<Trainee, 'id' | 'name' | 'employeeNumber' | 'department'>
export type Scenario = {
  id: string; code: string; title: string; area: string; hazard: ScenarioKind
  brief: string; objectives: string; instructorNotes: string; status: RecordStatus
  version: number; builtIn: boolean; sourceIncident: null | Pick<Incident, 'id' | 'reference' | 'title' | 'occurredOn' | 'lessons'>
  routeLossSeconds: number; alternateSeconds: number; timeLimitSeconds: number
  speed: number; startingNode: string; refugeNode: string; blockedEdges: string[]
  requiredActions: ActionKey[]; mistakePenalty: number
  normalAirflow: number; hazardAirflow: number; hazardVisibility: number
  createdAt: number; updatedAt: number
}
export type Movement = { from: string; to: string; startMs: number; endMs: number }
export type TrainingEvent = {
  id: string; atMs: number; phase: DrillPhase
  kind: 'phase' | 'decision' | 'movement' | 'control' | 'observation'
  title: string; detail: string; actor: string; success: boolean | null
  action?: ActionKey; node?: string; movement?: Movement; observation?: ObservationKey; checked?: boolean
}
export type TrainingSession = {
  schemaVersion: 2; id: string; scenario: Scenario; participants: Participant[]; instructor: string
  status: 'ready' | 'running' | 'paused' | 'complete'; phase: DrillPhase
  createdAt: number; startedAt: number | null; endedAt: number | null
  elapsedMs: number; resumedAt: number | null; autoEvents: boolean
  node: string; movement: Movement | null; decisions: Record<ActionKey, number | null>
  observations: Record<ObservationKey, number | null>; mistakes: number
  outcome: 'In progress' | 'Refuge reached' | 'Ended early' | 'Time limit reached' | 'Earlier drill'
  notes: string; events: TrainingEvent[]; earlierRecord: unknown | null
}
export type Preferences = {
  instructor: string; organisation: string; autoEvents: boolean; showRoutes: boolean
  showLabels: boolean; showGrid: boolean; showWarnings: boolean; viewStyle: 'wireframe' | 'solid' | 'rendered'
}
export type TrainingData = {
  schemaVersion: 2; scenarios: Scenario[]; incidents: Incident[]; trainees: Trainee[]
  sessions: TrainingSession[]; activeSessionId: string | null; preferences: Preferences
}
export type MineNode = { id: string; name: string; position: Point }
export type MineEdge = { id: string; from: string; to: string; route: 'approach' | 'primary' | 'alternate' }

export const ACTION_NAMES: Record<ActionKey, string> = {
  acknowledge: 'Identify the hazard', report: 'Raise the alarm', reject: 'Reject the withdrawn route', refuge: 'Reach the refuge',
}
export const OBSERVATION_NAMES: Record<ObservationKey, string> = {
  hazard: 'Hazard recognition observed', route: 'Route decision observed', alternate: 'Refuge arrival observed',
}
export const HAZARDS: Record<ScenarioKind, string> = {
  fire: 'Underground fire', rockfall: 'Fall of ground', ventilation: 'Ventilation loss',
}
export const NODES: MineNode[] = [
  { id: 'work', name: 'Work area', position: [-6.3, 0, 4] },
  { id: 'junction', name: 'Main junction', position: [0, 0, 4] },
  { id: 'loader', name: 'Loader bay', position: [2.7, 0, 4] },
  { id: 'exit', name: 'Primary exit approach', position: [5.2, 0, 4] },
  { id: 'turn', name: 'Crosscut', position: [0, 0, -0.5] },
  { id: 'cross', name: 'Refuge access', position: [0, 0, -5] },
  { id: 'refuge', name: 'Refuge Chamber 2', position: [5.4, 0, -5] },
]
export const EDGES: MineEdge[] = [
  { id: 'approach', from: 'work', to: 'junction', route: 'approach' },
  { id: 'route-a1', from: 'junction', to: 'loader', route: 'primary' },
  { id: 'route-a2', from: 'loader', to: 'exit', route: 'primary' },
  { id: 'route-b1', from: 'junction', to: 'turn', route: 'alternate' },
  { id: 'route-b2', from: 'turn', to: 'cross', route: 'alternate' },
  { id: 'route-b3', from: 'cross', to: 'refuge', route: 'alternate' },
]
