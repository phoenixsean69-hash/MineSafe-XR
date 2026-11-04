import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import type { Page, Participant, Preferences, Scenario, TrainingData, TrainingSession } from './types'
import { NODES } from './types'
import { activeTime, copy, duration, finishTraining, makeScenario, moveTrainee, newTraining, nextPhase,
  pauseTraining, recordObservation, scenarioFromIncident, startTraining, takeAction, tickTraining, uid } from './model'
import { useWorkspace } from './useWorkspace'
import { pausedData, mergeData } from './validation'
import { downloadBackup, downloadSession } from './io'
import { Badge, Button, Errors, Modal } from './ui'
import { DrillWorkspace } from './DrillWorkspace'
import { RunForm, ScenarioSetup } from './ScenarioSetup'
import { Incidents, Library, Trainees } from './Catalogs'
import { Debrief, Reports, Settings } from './ReviewReports'
import { SystemTimeline } from './SystemTimeline'

const PAGES: Page[] = ['Drill', 'Scenario Setup', 'Debrief', 'Scenario Library', 'Incidents', 'Trainees', 'Reports', 'Settings']

export default function SystemApp() {
  const store = useWorkspace()
  const { data, update } = store
  const [page, setPage] = useState<Page>('Drill')
  const [scenarioId, setScenarioId] = useState('builtin-fire')
  const [runScenario, setRunScenario] = useState<Scenario | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [help, setHelp] = useState(false)
  const [endDialog, setEndDialog] = useState(false)
  const [addTrainee, setAddTrainee] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [editorDirty, setEditorDirty] = useState(false)
  const [leaveDialog, setLeaveDialog] = useState(false)
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const pendingNavigation = useRef<(() => void) | null>(null)
  const initialized = useRef(false)
  const active = data?.sessions.find(session => session.id === data.activeSessionId) ?? null
  const selected = data?.scenarios.find(s => s.id === scenarioId) ?? data?.scenarios.find(s => s.status === 'ready') ?? data?.scenarios[0]

  const notify = useCallback((text: string) => setMessage(text), [])
  const changeActive = useCallback((change: (session: TrainingSession) => TrainingSession) => {
    update(current => {
      const index = current.sessions.findIndex(session => session.id === current.activeSessionId)
      if (index < 0) return current
      const next = change(current.sessions[index])
      if (next === current.sessions[index]) return current
      return { ...current, sessions: current.sessions.map((session, i) => i === index ? next : session) }
    })
  }, [update])

  useEffect(() => {
    if (!data || initialized.current) return
    initialized.current = true
    if (active) {
      setPage(active.status === 'complete' || active.earlierRecord !== null ? 'Debrief' : 'Drill')
      setScenarioId(active.scenario.id)
    }
  }, [data, active, notify])

  useEffect(() => {
    if (active?.status !== 'running') return
    const timer = window.setInterval(() => {
      const time = Date.now(); setNow(time); changeActive(session => tickTraining(session, time))
    }, 150)
    return () => window.clearInterval(timer)
  }, [active?.id, active?.status, changeActive])

  useEffect(() => { if (active?.status === 'complete') setPage('Debrief') }, [active?.id, active?.status])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [message])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])

  const commitNavigation = (next: Page) => {
    if (next !== 'Drill' && active?.status === 'running') changeActive(session => pauseTraining(session))
    setMenu(null); setPage(next)
  }
  const guard = (operation: () => void) => {
    if (page === 'Scenario Setup' && editorDirty) { pendingNavigation.current = operation; setLeaveDialog(true); return }
    operation()
  }
  const navigate = (next: Page) => { if (next !== page) guard(() => commitNavigation(next)); else setMenu(null) }
  const preferences = (values: Partial<Preferences>) => update(current => ({ ...current, preferences: { ...current.preferences, ...values } }))
  const saveScenario = (scenario: Scenario) => update(current => ({ ...current, scenarios: current.scenarios.some(s => s.id === scenario.id)
    ? current.scenarios.map(s => s.id === scenario.id ? scenario : s) : [...current.scenarios, scenario] }))
  const editScenario = (scenario: Scenario) => guard(() => { setScenarioId(scenario.id); commitNavigation('Scenario Setup') })
  const prepareDialog = (scenario: Scenario) => guard(() => { if (active?.status === 'running') changeActive(s => pauseTraining(s)); setRunScenario(scenario) })
  const prepare = (scenario: Scenario, participants: Participant[], instructor: string, automatic: boolean, start: boolean) => {
    let session = newTraining(scenario, participants, instructor, automatic)
    if (start) session = startTraining(session)
    if (start && session.status !== 'running') { notify('Check the scenario, instructor and participant details.'); return }
    update(current => {
      const paused = pausedData(current)
      return { ...paused, sessions: [...paused.sessions.filter(s => s.status !== 'ready' || s.events.length), session], activeSessionId: session.id,
        preferences: { ...current.preferences, instructor, autoEvents: automatic } }
    })
    setScenarioId(scenario.id); setRunScenario(null); setNow(Date.now()); setPage('Drill')
    notify(start ? 'Drill started' : 'Drill ready')
  }
  const openSession = (session: TrainingSession) => {
    update(current => {
      const next = pausedData(current)
      return { ...next, activeSessionId: session.id }
    })
    setScenarioId(session.scenario.id); setPage('Debrief')
  }
  const startPause = () => {
    if (!active) { if (selected) prepareDialog(selected); return }
    if (active.status === 'complete' || active.earlierRecord !== null) { prepareDialog({ ...active.scenario, status: 'ready' }); return }
    changeActive(s => startTraining(s)); setNow(Date.now()); setPage('Drill')
  }
  const newScenario = () => guard(() => {
    const scenario = makeScenario(); saveScenario(scenario); setScenarioId(scenario.id); commitNavigation('Scenario Setup')
  })
  const duplicateScenario = () => guard(() => {
    const source = active?.scenario ?? selected
    if (!source) return
    const scenario = { ...copy(source), id: uid('scenario'), code: makeScenario(source.hazard).code, title: source.title.slice(0, 173) + ' - copy',
      status: 'draft' as const, version: 1, builtIn: false, createdAt: Date.now(), updatedAt: Date.now() }
    saveScenario(scenario); setScenarioId(scenario.id); commitNavigation('Scenario Setup')
  })
  const addParticipant = () => { setRunScenario(null); setAddTrainee(true); navigate('Trainees') }
  const requestEnd = () => { if (active?.status === 'running') changeActive(s => pauseTraining(s)); setEndDialog(true) }
  const menuActions: Record<string, { label: string; action: () => void; disabled?: boolean }[]> = {
    File: [
      { label: 'New drill', action: () => selected && prepareDialog(selected), disabled: !selected || selected.status !== 'ready' },
      { label: 'New scenario', action: newScenario },
      { label: 'Export active drill', action: () => active && downloadSession(active), disabled: !active?.events.length },
      { label: 'Download workspace backup', action: () => data && downloadBackup(data) },
      { label: 'Backups & import', action: () => navigate('Settings') },
    ],
    Edit: [{ label: 'Scenario setup', action: () => navigate('Scenario Setup') }, { label: 'Trainee records', action: () => navigate('Trainees') }, { label: 'Incident records', action: () => navigate('Incidents') }],
    Scenario: [
      { label: 'Introduce next event', action: () => changeActive(s => nextPhase(s)), disabled: active?.status !== 'running' || active.phase === 'reroute' },
      { label: 'End current drill', action: requestEnd, disabled: !active || active.status === 'ready' || active.status === 'complete' || active.earlierRecord !== null },
      { label: 'Duplicate current scenario', action: duplicateScenario, disabled: !selected },
    ],
    View: data ? [
      { label: data.preferences.showRoutes ? 'Hide route guidance' : 'Show route guidance', action: () => preferences({ showRoutes: !data.preferences.showRoutes }) },
      { label: data.preferences.showLabels ? 'Hide scene labels' : 'Show scene labels', action: () => preferences({ showLabels: !data.preferences.showLabels }) },
      { label: data.preferences.showGrid ? 'Hide viewport grid' : 'Show viewport grid', action: () => preferences({ showGrid: !data.preferences.showGrid }) },
      { label: 'Workspace settings', action: () => navigate('Settings') },
    ] : [],
    Playback: [{ label: active?.status === 'running' ? 'Pause active drill' : active?.status === 'complete' || active?.earlierRecord !== null ? 'Prepare another drill' : 'Start / resume active drill', action: startPause },
      { label: 'Review active drill', action: () => navigate('Debrief'), disabled: !active }],
    Help: [{ label: 'Controls & workflow', action: () => setHelp(true) }],
  }

  if (!data || !selected) return <main className="sys-loading"><span className="sys-loading-brand"><Icon name="shield" />MineSafe XR</span>
    {store.error ? <><Errors messages={[store.error]} /><Button tone="primary" onClick={() => window.location.reload()}>Reload workspace</Button></> : <p>Opening your local training workspace...</p>}</main>

  const status = active ? active.earlierRecord !== null ? 'Earlier record' : active.status === 'running' ? 'Running' : active.status === 'paused' ? 'Paused' : active.status === 'complete' ? 'Debrief ready' : 'Ready' : 'Ready'
  return <main className={'app-shell system-app' + (page === 'Drill' && timelineExpanded ? ' sys-timeline-expanded' : '')} data-page={page} onClick={event => {
    if (!(event.target as Element).closest('.main-menu')) setMenu(null)
  }}>
    <header className="app-menu-bar">
      <div className="brand-chip"><span className="brand-symbol"><Icon name="shield" /></span><strong>MineSafe XR</strong></div>
      <nav className="main-menu" aria-label="Application menu">{Object.keys(menuActions).map(name => <div className="menu-slot" key={name}>
        <button aria-expanded={menu === name} className={menu === name ? 'active' : ''} onClick={() => setMenu(menu === name ? null : name)}>{name}</button>
        {menu === name && <div className="app-dropdown">{menuActions[name].map(item => <button key={item.label} disabled={item.disabled} onClick={() => { setMenu(null); item.action() }}>{item.label}</button>)}</div>}
      </div>)}</nav>
      <div className="top-status"><span className="prototype-tag">Safety training</span><span className={'status-indicator status-' + (active?.phase ?? 'idle')}><i />{status}</span></div>
    </header>
    <div className="workspace-tabs-bar"><nav className="workspace-tabs" role="tablist" aria-label="Workspace">{PAGES.map(name =>
      <button key={name} role="tab" aria-selected={page === name} className={page === name ? 'active' : ''} onClick={() => navigate(name)}>{name}</button>)}</nav>
      <div className="scene-file">{(page === 'Scenario Setup' ? selected : active?.scenario ?? selected).code} · {(page === 'Scenario Setup' ? selected : active?.scenario ?? selected).area}</div></div>
    <section className={'workspace-content sys-workspace ' + (store.error ? 'has-save-error' : '')}>
      {store.error && <div className="sys-storage-error" role="alert"><span>{store.error}</span><Button icon="download" onClick={() => downloadBackup(data)}>Download backup</Button><Button onClick={store.retry}>Try saving again</Button><Button onClick={() => window.location.reload()}>Reload</Button></div>}
      {page === 'Drill' && <DrillWorkspace data={data} session={active} scenario={selected} now={now} onPrepare={prepare} onAddTrainee={addParticipant}
        onStartPause={startPause} onNext={() => changeActive(s => nextPhase(s))} onEnd={requestEnd}
        onAction={action => changeActive(s => takeAction(s, action))} onMove={node => changeActive(s => moveTrainee(s, node))}
        onObservation={(key, checked) => changeActive(s => recordObservation(s, key, checked))}
        onPreferences={preferences} onAutomatic={automatic => changeActive(s => {
          if (s.status === 'complete' || s.earlierRecord !== null) return s
          if (s.status === 'ready') return { ...s, autoEvents: automatic }
          return { ...s, autoEvents: automatic, events: [...s.events, { id: uid('event'), atMs: activeTime(s), phase: s.phase,
            kind: 'control', title: automatic ? 'Timed events enabled' : 'Manual events enabled', detail: 'Event control mode changed by the instructor.', actor: s.instructor, success: null }] }
        })} onNewDrill={() => prepareDialog({ ...(active?.scenario ?? selected), status: 'ready' })} />}
      {page === 'Scenario Setup' && <ScenarioSetup scenario={selected} data={data} onSave={saveScenario} onSelect={setScenarioId} onPrepare={prepare} onAddTrainee={addParticipant} notify={notify} onDirty={setEditorDirty} />}
      {page === 'Debrief' && <Debrief session={active} data={data} onNotes={notes => { changeActive(s => ({ ...s, notes })); notify('Debrief notes saved') }}
        onFollowUp={() => {
          if (!active?.notes.trim()) return
          const scenario = { ...copy(active.scenario), id: uid('scenario'), code: makeScenario(active.scenario.hazard).code,
            title: active.scenario.title.slice(0, 168) + ' - follow-up', status: 'draft' as const, builtIn: false, version: 1,
            instructorNotes: ('Follow-up to drill ' + active.id + '.\n' + active.notes + '\n' + active.scenario.instructorNotes).slice(0, 20000),
            createdAt: Date.now(), updatedAt: Date.now() }
          saveScenario(scenario); editScenario(scenario); notify('Saved learning points copied into a follow-up draft')
        }}
        onRepeat={() => prepareDialog({ ...(active?.scenario ?? selected), status: 'ready' })} />}
      {page === 'Scenario Library' && <Library data={data} onEdit={editScenario} onPrepare={prepareDialog} onSave={saveScenario} onOpenSession={openSession} notify={notify} />}
      {page === 'Incidents' && <Incidents data={data} onSave={record => update(current => ({ ...current, incidents: current.incidents.some(i => i.id === record.id) ? current.incidents.map(i => i.id === record.id ? record : i) : [...current.incidents, record] }))}
        onCreateScenario={record => { const scenario = scenarioFromIncident(record); saveScenario(scenario); editScenario(scenario); notify('Incident linked to a new scenario draft') }} notify={notify} />}
      {page === 'Trainees' && <Trainees key={addTrainee ? 'add-trainee' : 'trainees'} data={data} autoAdd={addTrainee} onAdded={() => setAddTrainee(false)} onSave={record =>
        update(current => ({ ...current, trainees: current.trainees.some(t => t.id === record.id) ? current.trainees.map(t => t.id === record.id ? record : t) : [...current.trainees, record] }))}
        onOpenSession={openSession} notify={notify} />}
      {page === 'Reports' && <Reports data={data} onOpenSession={openSession} />}
      {page === 'Settings' && <Settings data={data} onPreferences={value => preferences(value)} onImport={incoming => {
        const result = mergeData(data, incoming); update(current => mergeData(current, incoming).data); notify('Backup merged: ' + result.added + ' records added; ' + result.skipped + ' existing records retained.')
      }} notify={notify} />}
    </section>
    {page === 'Drill' && <SystemTimeline session={active} page={page} now={now} onStartPause={startPause} onNext={() => changeActive(s => nextPhase(s))}
      expanded={timelineExpanded} onToggleExpanded={() => setTimelineExpanded(value => !value)} onEnd={requestEnd} onReview={() => navigate('Debrief')} />}
    <footer className="status-bar"><div><Icon name="info" />Simulated hazards · Trainee inputs & instructor observations</div><div className="status-right">
      <span className={store.error ? 'value-danger' : ''}>{store.error ? 'Unsaved changes' : store.saving ? 'Saving...' : 'Saved on this device'}</span>
      <span>{active?.participants.map(p => p.name).join(', ') || data.preferences.organisation || 'Local workspace'}</span><span>{duration(active ? activeTime(active, now) : 0)}</span></div></footer>
    {message && <div className="app-toast" role="status">{message}</div>}
    {leaveDialog && <Modal title="Leave unsaved scenario edits?" onClose={() => { pendingNavigation.current = null; setLeaveDialog(false) }}>
      <p>Your saved scenario will be retained. The current unsaved edits will be discarded if you leave.</p>
      <footer className="sys-dialog-actions"><Button onClick={() => { pendingNavigation.current = null; setLeaveDialog(false) }}>Keep editing</Button>
        <Button tone="danger" onClick={() => { const operation = pendingNavigation.current; pendingNavigation.current = null; setLeaveDialog(false); setEditorDirty(false); operation?.() }}>Discard unsaved edits</Button></footer>
    </Modal>}
    {runScenario && <Modal title="Prepare a drill" onClose={() => setRunScenario(null)}><h3>{runScenario.title}</h3><p className="sys-muted">{runScenario.code} · v{runScenario.version} · {runScenario.area}</p>
      <RunForm scenario={runScenario} data={data} onPrepare={prepare} onAddTrainee={addParticipant} /></Modal>}
    {endDialog && active && <Modal title="End current drill?" onClose={() => setEndDialog(false)}><p>The current position and recorded actions will be retained. An unfinished objective remains incomplete.</p>
      <footer className="sys-dialog-actions"><Button onClick={() => setEndDialog(false)}>Keep drill open</Button><Button tone="danger" icon="flag" onClick={() => { changeActive(s => finishTraining(s, 'Ended early')); setEndDialog(false) }}>End drill</Button></footer></Modal>}
    {help && <Modal title="MineSafe XR · Controls & workflow" wide onClose={() => setHelp(false)}>
      <h3>From an incident to a drill</h3><p>Record the event under Incidents, then choose Create drill. Edit the linked draft in Scenario Setup, save it as ready and assign participants.</p>
      <h3>Run the exercise</h3><p>Start the drill. In manual mode, Next event withdraws the primary route and then introduces the alternate route. Timed events use the scenario's saved schedule.</p>
      <p>Trainee decisions are recorded through Identify the hazard, Raise the alarm and Reject the withdrawn route. Move with connected waypoint controls or keys 1–4. The avatar travels through the layout and refuge arrival is recorded from its position.</p>
      <h3>View controls</h3><p>Orbit, Pan and Zoom change the left-drag camera action. Right-drag pans; the wheel zooms. Frame scene resets the camera. Follow trainee centres the view on the moving participant.</p>
      <h3>Review and retain records</h3><p>Debrief replays saved states without altering results. Save learning points as notes. Reports exports the filtered drill list to CSV or print. Settings creates and imports full workspace backups.</p>
      <p className="sys-muted">Use the same browser and localhost address for the same workspace. Export backups for transfer to another computer. This is a desktop simulation; the route graph and displayed conditions belong to its training layout.</p>
    </Modal>}
  </main>
}
