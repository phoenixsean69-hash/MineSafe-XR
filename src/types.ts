export type DrillPhase = 'idle' | 'alarm' | 'blocked' | 'reroute' | 'complete'
export type ViewStyle = 'wireframe' | 'solid' | 'rendered'
export type Workspace = 'Drill' | 'Scenario Setup' | 'Debrief' | 'Scenario Library'
export type ScenarioKind = 'fire' | 'rockfall' | 'ventilation'

export type ScenarioDefinition = {
  id: ScenarioKind
  code: string
  title: string
  subtitle: string
  hazardLabel: string
  sceneAsset: string
  objective: string
  sourceNote: string
}

export type EventItem = {
  phase: DrillPhase
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'danger' | 'safe'
}

export const PHASES: DrillPhase[] = ['idle', 'alarm', 'blocked', 'reroute', 'complete']

export const PHASE_TIME: Record<DrillPhase, number> = {
  idle: 0,
  alarm: 8,
  blocked: 16,
  reroute: 24,
  complete: 36,
}

export const SCENARIOS: Record<ScenarioKind, ScenarioDefinition> = {
  fire: {
    id: 'fire',
    code: 'MXR-01',
    title: 'Underground fire drill',
    subtitle: 'North Decline - Level 4',
    hazardLabel: 'Loader bay fire',
    sceneAsset: 'Loader bay',
    objective: 'Recognise the simulated fire, reject Route A when it becomes unsafe, and reach Refuge Chamber 2.',
    sourceNote: 'Prototype training scenario',
  },
  rockfall: {
    id: 'rockfall',
    code: 'MXR-02',
    title: 'Fall-of-ground response',
    subtitle: 'East Access - Level 3',
    hazardLabel: 'Rockfall zone',
    sceneAsset: 'East access drive',
    objective: 'Recognise the simulated fall of ground, avoid the blocked drive, and use the alternate refuge route.',
    sourceNote: 'Prototype training scenario',
  },
  ventilation: {
    id: 'ventilation',
    code: 'MXR-03',
    title: 'Ventilation loss drill',
    subtitle: 'Ventilation District B',
    hazardLabel: 'Fan loss',
    sceneAsset: 'Ventilation fan 03',
    objective: 'Recognise reduced ventilation, withdraw from the affected district, and follow the marked safe route.',
    sourceNote: 'Prototype training scenario',
  },
}

export function getEvents(kind: ScenarioKind): EventItem[] {
  if (kind === 'rockfall') {
    return [
      { phase: 'idle', time: '00:00', title: 'Area ready', detail: 'East Access loaded with baseline training conditions.', tone: 'neutral' },
      { phase: 'alarm', time: '00:08', title: 'Ground event introduced', detail: 'Loose-ground warning initiated in the access drive.', tone: 'danger' },
      { phase: 'blocked', time: '00:16', title: 'Drive blocked', detail: 'Simulated rockfall closes the primary travel route.', tone: 'danger' },
      { phase: 'reroute', time: '00:24', title: 'Alternate route selected', detail: 'Worker 017 turns toward the alternate refuge route.', tone: 'safe' },
      { phase: 'complete', time: '00:36', title: 'Exercise ended', detail: 'Response is available for replay and debrief.', tone: 'safe' },
    ]
  }

  if (kind === 'ventilation') {
    return [
      { phase: 'idle', time: '00:00', title: 'Ventilation stable', detail: 'District B loaded with normal training conditions.', tone: 'neutral' },
      { phase: 'alarm', time: '00:08', title: 'Fan loss introduced', detail: 'Ventilation fan 03 is set to failed in the simulation.', tone: 'danger' },
      { phase: 'blocked', time: '00:16', title: 'Airflow falls', detail: 'The affected district is marked unsafe for continued travel.', tone: 'danger' },
      { phase: 'reroute', time: '00:24', title: 'Withdrawal route selected', detail: 'Worker 017 follows the marked fresh-air route.', tone: 'safe' },
      { phase: 'complete', time: '00:36', title: 'Exercise ended', detail: 'Ventilation response is available for debrief.', tone: 'safe' },
    ]
  }

  return [
    { phase: 'idle', time: '00:00', title: 'Area ready', detail: 'North Decline loaded with baseline training conditions.', tone: 'neutral' },
    { phase: 'alarm', time: '00:08', title: 'Fire inject started', detail: 'Simulated heat source introduced at the loader bay.', tone: 'danger' },
    { phase: 'blocked', time: '00:16', title: 'Route A withdrawn', detail: 'Smoke spread makes the primary escapeway unsafe.', tone: 'danger' },
    { phase: 'reroute', time: '00:24', title: 'Alternate route selected', detail: 'Worker 017 turns toward Refuge Chamber 2.', tone: 'safe' },
    { phase: 'complete', time: '00:36', title: 'Exercise ended', detail: 'Actions and timing are available for debrief.', tone: 'safe' },
  ]
}