import { useEffect, useState } from 'react'
import MineScene from '../components/MineScene'
import Icon from '../components/Icon'
import type { CameraMode } from '../types'
import type { ActionKey, ObservationKey, Participant, Preferences, Scenario, TrainingData, TrainingSession } from './types'
import { ACTION_NAMES, EDGES, HAZARDS, NODES, OBSERVATION_NAMES } from './types'
import { activeTime, duration, edgeBetween, isBlocked, neighbours, nodePoint, playerPosition, replayState, sceneRoutes } from './model'
import { Badge, Button, Modal, Panel } from './ui'
import { RunForm } from './ScenarioSetup'

type Props = {
  data: TrainingData; session: TrainingSession | null; scenario: Scenario; now: number
  onPrepare: (s: Scenario, p: Participant[], instructor: string, automatic: boolean, start: boolean) => void
  onAddTrainee: () => void; onStartPause: () => void; onNext: () => void; onEnd: () => void
  onAction: (action: ActionKey) => void; onMove: (node: string) => void
  onObservation: (key: ObservationKey, checked: boolean) => void
  onPreferences: (preferences: Partial<Preferences>) => void; onAutomatic: (automatic: boolean) => void
  onNewDrill: () => void
}
export function DrillWorkspace(props: Props) {
  const { session, data } = props
  const prefs = data.preferences
  const scenario = session?.scenario ?? props.scenario
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [inspector, setInspector] = useState('safety')
  const [entity, setEntity] = useState('trainee')
  const [cameraKey, setCameraKey] = useState(0)
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | undefined>()
  const [details, setDetails] = useState(false)
  const [follow, setFollow] = useState(false)
  const [sections, setSections] = useState<Record<string, boolean>>({ conditions: true, decisions: true, move: true, observations: false, aids: false })
  const time = session ? activeTime(session, props.now) : 0
  const phase = session ? session.status === 'complete' ? replayState(session, session.elapsedMs).phase : session.phase : 'idle'
  const position = session ? playerPosition(session, props.now) : nodePoint(scenario.startingNode)
  const running = session?.status === 'running'
  const destinations = session ? neighbours(session.node) : []
  const waypoints = session && running && !session.movement ? destinations.map(id => ({
    ...NODES.find(n => n.id === id)!, blocked: isBlocked(session, edgeBetween(session.node, id)!.id),
  })) : []
  const trail = session ? [nodePoint(session.scenario.startingNode), ...session.events.filter(e => e.kind === 'movement' && e.success && e.node).map(e => nodePoint(e.node!)), ...(session.movement ? [position] : [])] : []
  const toggle = (name: string) => setSections(current => ({ ...current, [name]: !current[name] }))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!running || session?.movement || (event.target as HTMLElement).closest('input, textarea, select, dialog')) return
      const index = ['1', '2', '3', '4'].indexOf(event.key)
      if (index >= 0 && destinations[index]) { event.preventDefault(); props.onMove(destinations[index]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, session?.movement, session?.node, destinations.join('|'), props.onMove])

  const accordion = (key: string, title: string, content: React.ReactNode) => <section className="sys-inspector-section">
    <button className="property-heading" aria-expanded={sections[key]} onClick={() => toggle(key)}><Icon name={sections[key] ? 'expand_more' : 'chevron_right'} />{title}</button>
    {sections[key] && <div className="sys-inspector-body">{content}</div>}
  </section>
  const frame = () => { setCameraTarget(undefined); setFollow(false); setCameraKey(value => value + 1) }
  const selectEntity = (id: string) => {
    setEntity(id)
    if (id === 'route' || id === 'refuge') setInspector('routes')
    if (id === 'fan') setInspector('environment')
    if (id === 'trainee') { setCameraTarget([position[0], 0.9, position[2]]); setInspector('safety') }
    if (id === 'loader') setCameraTarget([2.7, 0.9, 4])
    if (id === 'refuge') setCameraTarget([5.4, 0.9, -5])
  }
  return <section className="screen-editor-grid sys-drill">
    <aside className="tool-rail" aria-label="Viewport tools">
      {([['orbit', 'orbit', 'Orbit'], ['pan', 'pan_tool', 'Pan'], ['zoom', 'zoom_in', 'Zoom']] as [CameraMode, string, string][]).map(([id, icon, label]) =>
        <Button key={id} tone="tool" icon={icon} title={label} aria-pressed={cameraMode === id} className={cameraMode === id ? 'selected' : ''} onClick={() => setCameraMode(id)} />)}
      <span className="tool-separator" /><Button tone="tool" icon="filter_center_focus" title="Frame scene" onClick={frame} />
      <Button tone="tool" icon="person" title="Follow trainee" aria-pressed={follow} className={follow ? 'selected' : ''} onClick={() => setFollow(!follow)} />
    </aside>
    <aside className="outliner-panel">
      <header className="editor-header"><span>Scenario</span><div className="sys-actions">
        <Button tone="tool" icon="search" title="Find trainee" onClick={() => selectEntity('trainee')} />
        <Button tone="tool" icon="more_vert" title="Scenario details" onClick={() => setDetails(true)} /></div></header>
      <div className="scenario-name"><div className="scenario-glyph danger"><Icon name={scenario.hazard === 'fire' ? 'local_fire_department' : scenario.hazard === 'rockfall' ? 'landslide' : 'air'} /></div><div><strong>{scenario.title}</strong><span>{scenario.area}</span></div></div>
      <div className="tree-list">
        <button className="tree-row root" onClick={frame}><Icon name="expand_more" /><Icon name="folder_open" />Training scene</button>
        {[
          ['trainee', 'person', session?.participants.map(p => p.name).join(', ') || 'Trainee position'],
          ['loader', 'precision_manufacturing', 'Loader bay'], ['route', 'route', 'Route A'],
          ['refuge', 'meeting_room', 'Refuge Chamber 2'], ['fan', 'air', 'Ventilation district'],
        ].map(([id, icon, name]) => <button key={id} className={'tree-row child ' + (entity === id ? 'selected' : '')} onClick={() => selectEntity(id)}><Icon name={icon} /><span>{name}</span></button>)}
      </div>
      <div className="panel-section compact-facts"><div className="section-title">Exercise</div><dl>
        <div><dt>Participants</dt><dd>{session?.participants.length ?? 0}</dd></div>
        <div><dt>Instructor</dt><dd>{session?.instructor || 'Not assigned'}</dd></div>
        <div><dt>Active time</dt><dd>{duration(time)}</dd></div>
        <div><dt>Position</dt><dd>{NODES.find(n => n.id === session?.node)?.name ?? 'Work area'}</dd></div>
      </dl></div>
      <div className="panel-section brief-section"><div className="section-title">Training brief</div><p>{scenario.brief}</p></div>
      {scenario.sourceIncident && <div className="panel-section brief-section"><div className="section-title">Source incident</div><p>{scenario.sourceIncident.reference} · {scenario.sourceIncident.title}</p></div>}
    </aside>
    <section className="viewport-editor">
      <header className="viewport-header editor-header"><div className="viewport-mode">
        <Button icon="deployed_code" onClick={frame}>Frame scene</Button><span className="divider" />
        <Button tone="tool" icon="layers" title="Toggle labels" aria-pressed={prefs.showLabels} className={prefs.showLabels ? 'selected' : ''} onClick={() => props.onPreferences({ showLabels: !prefs.showLabels })} />
        <Button tone="tool" icon="route" title="Toggle routes" aria-pressed={prefs.showRoutes} className={prefs.showRoutes ? 'selected' : ''} onClick={() => props.onPreferences({ showRoutes: !prefs.showRoutes })} />
      </div><div className="viewport-actions">
        <Button tone="tool" icon="grid_4x4" title="Toggle grid" className={prefs.showGrid ? 'selected' : ''} onClick={() => props.onPreferences({ showGrid: !prefs.showGrid })} />
        {(['wireframe', 'solid', 'rendered'] as const).map(style => <Button key={style} tone="tool" icon={style === 'wireframe' ? 'grid_on' : style === 'solid' ? 'circle' : 'view_in_ar'}
          title={style[0].toUpperCase() + style.slice(1)} aria-pressed={prefs.viewStyle === style} className={prefs.viewStyle === style ? 'selected' : ''} onClick={() => props.onPreferences({ viewStyle: style })} />)}
      </div></header>
      <div className={'viewport-stage ' + (prefs.showGrid ? '' : 'grid-hidden')}>
        <MineScene key={cameraKey} phase={phase} scenario={scenario.hazard} viewStyle={prefs.viewStyle} showRoutes={prefs.showRoutes} showLabels={prefs.showLabels}
          cameraMode={cameraMode} playerPosition={position} playerLabel={session?.participants[0]?.name}
          trail={trail} waypoints={waypoints} onWaypoint={props.onMove} routeSegments={sceneRoutes(scenario, phase)}
          cameraTarget={follow ? [position[0], 0.9, position[2]] : cameraTarget} />
        <div className="viewport-overlay top-left"><strong>{scenario.area}</strong><span>Cutaway training view · Simulated hazards</span></div>
        {prefs.showWarnings && phase !== 'idle' && <div className="simulation-banner"><Icon name="warning" /><div><strong>Simulation active</strong><span>Displayed hazards are training data.</span></div></div>}
        <div className="viewport-hint"><span><Icon name="mouse" />{cameraMode === 'orbit' ? 'Orbit' : cameraMode === 'pan' ? 'Pan' : 'Zoom'}</span><span><Icon name="walk" />Choose a waypoint to move</span></div>
        {session?.movement && <div className="sys-movement-banner"><Icon name="walk" />Moving to {NODES.find(n => n.id === session.movement?.to)?.name}{!running && ' · paused'}</div>}
      </div>
    </section>
    <aside className="properties-editor">
      <div className="properties-tabs">{[['safety', 'health_and_safety', 'Safety'], ['environment', 'air', 'Environment'], ['routes', 'route', 'Routes'], ['observations', 'fact_check', 'Observations']].map(([id, icon, label]) =>
        <Button key={id} tone="tool" icon={icon} title={label} className={inspector === id ? 'selected' : ''} onClick={() => setInspector(id)} />)}</div>
      <div className="properties-content">
        <header className="editor-header properties-titlebar"><span>{inspector === 'safety' ? 'Safety' : inspector === 'environment' ? 'Environment' : inspector === 'routes' ? 'Routes' : 'Observations'}</span>
          <Button tone="tool" icon="more_horiz" title="Drill information" onClick={() => setDetails(true)} /></header>
        {!session ? <div className="sys-inspector-body"><h3>Prepare a drill</h3><p className="sys-muted">{scenario.title}</p><RunForm scenario={scenario} data={data} onPrepare={props.onPrepare} onAddTrainee={props.onAddTrainee} /></div>
          : <>
            {inspector === 'safety' && <>
              <div className={'risk-readout risk-' + (phase === 'idle' ? 'low' : phase === 'blocked' ? 'critical' : phase === 'alarm' ? 'high' : 'rerouted')}>
                <div><span>Current training risk</span><strong>{phase === 'idle' ? 'Low' : phase === 'blocked' ? 'Critical' : phase === 'alarm' ? 'High' : 'Route changed'}</strong></div><Icon name={phase === 'idle' ? 'shield' : 'warning'} /></div>
              {accordion('conditions', 'Mine conditions', <><div className="property-line"><span>Airflow</span><strong>{phase === 'idle' ? scenario.normalAirflow : scenario.hazardAirflow} m/s</strong></div>
                <div className="meter"><i style={{ width: (phase === 'idle' ? 85 : scenario.hazardAirflow / Math.max(scenario.normalAirflow, 1) * 85) + '%' }} /></div>
                <div className="property-line"><span>Visibility</span><strong>{phase === 'idle' ? 92 : scenario.hazardVisibility}%</strong></div>
                <div className="meter"><i style={{ width: (phase === 'idle' ? 92 : scenario.hazardVisibility) + '%' }} /></div>
                <div className="property-line"><span>Primary route</span><strong className={phase === 'blocked' || phase === 'reroute' ? 'value-danger' : 'value-safe'}>{phase === 'blocked' || phase === 'reroute' ? 'WITHDRAWN' : 'OPEN'}</strong></div></>)}
              {accordion('decisions', 'Trainee decisions', <div className="sys-decision-list">{(['acknowledge', 'report', 'reject'] as ActionKey[]).map(action =>
                <Button key={action} icon={session.decisions[action] === null ? action === 'report' ? 'bell' : action === 'reject' ? 'route' : 'warning' : 'check'}
                  disabled={!running || session.decisions[action] !== null || action === 'reject' && phase === 'alarm'} onClick={() => props.onAction(action)}>
                  <span>{ACTION_NAMES[action]}{session.decisions[action] !== null && <small>Recorded at {duration(session.decisions[action])}</small>}</span></Button>)}
                <p className="sys-muted">These actions are recorded as trainee inputs. Instructor observations are separate.</p></div>)}
              {accordion('move', 'Move trainee', <><p className="sys-muted">Choose a connected waypoint, click its marker, or use keys 1–{destinations.length}.</p>
                <div className="sys-destinations">{destinations.map((id, index) => <Button key={id} icon={isBlocked(session, edgeBetween(session.node, id)!.id) ? 'warning' : 'walk'}
                  className={isBlocked(session, edgeBetween(session.node, id)!.id) ? 'sys-route-closed' : ''} disabled={!running || Boolean(session.movement)} onClick={() => props.onMove(id)}>
                  <span>{index + 1}. {NODES.find(n => n.id === id)?.name}{isBlocked(session, edgeBetween(session.node, id)!.id) && <small>Withdrawn route · Attempt will be recorded</small>}</span></Button>)}</div>
                {session.node === scenario.refugeNode && session.status !== 'complete' && <div className="sys-inline-note">Refuge reached. Complete the outstanding required actions to finish the drill.</div>}</>)}
              {accordion('aids', 'System aids', <div className="sys-toggle-list">
                <label className="system-switch"><span>Timed scenario events</span><span className="switch-control"><input type="checkbox" role="switch" disabled={session.status === 'complete'} checked={session.autoEvents} onChange={e => props.onAutomatic(e.target.checked)} /><i /></span></label>
                {([['showRoutes', 'Route guidance'], ['showLabels', 'Scene labels'], ['showWarnings', 'Hazard banner'], ['showGrid', 'Viewport grid']] as const).map(([key, label]) =>
                  <label className="system-switch" key={key}><span>{label}</span><span className="switch-control"><input type="checkbox" role="switch" checked={prefs[key]} onChange={e => props.onPreferences({ [key]: e.target.checked })} /><i /></span></label>)}
              </div>)}
            </>}
            {inspector === 'environment' && <div className="sys-inspector-body"><h3>{HAZARDS[scenario.hazard]}</h3><dl className="sys-key-values"><div><dt>Area</dt><dd>{scenario.area}</dd></div><div><dt>Scenario</dt><dd>{scenario.code} · v{scenario.version}</dd></div>
              <div><dt>Route withdrawal</dt><dd>{scenario.routeLossSeconds}s</dd></div><div><dt>Alternate route</dt><dd>{scenario.alternateSeconds}s</dd></div><div><dt>Time limit</dt><dd>{duration(scenario.timeLimitSeconds * 1000)}</dd></div></dl><p className="sys-preserve">{scenario.instructorNotes || scenario.objectives}</p></div>}
            {inspector === 'routes' && <div className="sys-inspector-body"><h3>Connected routes</h3><p className="sys-muted">Current position: {NODES.find(n => n.id === session.node)?.name}</p>
              {EDGES.map(edge => <div className="sys-route-row" key={edge.id}><span>{NODES.find(n => n.id === edge.from)?.name} → {NODES.find(n => n.id === edge.to)?.name}</span><Badge tone={isBlocked(session, edge.id) ? 'danger' : 'safe'}>{isBlocked(session, edge.id) ? 'Withdrawn' : 'Open'}</Badge></div>)}
              <p className="sys-muted">Movement follows connected sections. Attempts to enter a withdrawn section are stopped and recorded.</p></div>}
            {inspector === 'observations' && <div className="sys-inspector-body"><h3>Instructor observations</h3><p className="sys-muted">Mark actions you directly observe. These entries do not award drill points.</p>
              {(Object.entries(OBSERVATION_NAMES) as [ObservationKey, string][]).map(([key, label]) => <label className="sys-check" key={key}><input type="checkbox" checked={session.observations[key] !== null} disabled={!running} onChange={e => props.onObservation(key, e.target.checked)} />
                <span>{label}<small>{duration(session.observations[key])}</small></span></label>)}
              <dl className="sys-key-values"><div><dt>Required actions recorded</dt><dd>{scenario.requiredActions.filter(a => session.decisions[a] !== null).length}/{scenario.requiredActions.length}</dd></div><div><dt>Withdrawn-route attempts</dt><dd>{session.mistakes}</dd></div></dl></div>}
          </>}
        {session && <div className="exercise-controls">
          <Button tone="primary" className="primary-action" icon={running ? 'pause' : 'play_arrow'} onClick={session.status === 'complete' || session.earlierRecord !== null ? props.onNewDrill : props.onStartPause}>{session.status === 'complete' || session.earlierRecord !== null ? 'New drill' : running ? 'Pause drill' : session.status === 'ready' ? 'Start drill' : 'Resume drill'}</Button>
          <Button className="secondary-action" icon="add_alert" disabled={!running || phase === 'reroute'} onClick={props.onNext}>Next event</Button>
          <Button tone="tool" className="icon-action" icon="restart_alt" title="Prepare another drill" onClick={props.onNewDrill} />
        </div>}
      </div>
    </aside>
    {details && <Modal title={scenario.title} onClose={() => setDetails(false)}><p className="sys-detail-meta">{scenario.code} · Version {scenario.version} · {scenario.area}</p><h3>Brief</h3><p className="sys-preserve">{scenario.brief}</p><h3>Learning objectives</h3><p className="sys-preserve">{scenario.objectives}</p>
      {scenario.sourceIncident && <p>Source: {scenario.sourceIncident.reference} · {scenario.sourceIncident.title}</p>}
      {session && <><h3>Participants</h3><p>{session.participants.map(p => p.name).join(', ')}</p><p>Instructor: {session.instructor}</p><Button icon="flag" disabled={session.status === 'complete' || session.status === 'ready'} onClick={() => { setDetails(false); props.onEnd() }}>End current drill</Button></>}
    </Modal>}
  </section>
}
