import { useEffect, useMemo, useRef, useState } from 'react'
import MineScene from '../components/MineScene'
import Icon from '../components/Icon'
import type { Preferences, TrainingData, TrainingSession } from './types'
import { ACTION_NAMES, OBSERVATION_NAMES } from './types'
import { drillScore, duration, nodePoint, replayState, sceneRoutes } from './model'
import { download, downloadBackup, downloadSession, sessionsCsv } from './io'
import { mergeData, parseBackup } from './validation'
import { Badge, Button, dateLabel, Empty, Errors, Field, Modal, Panel } from './ui'

export function Debrief({ session, data, onNotes, onRepeat, onFollowUp }: { session: TrainingSession | null; data: TrainingData;
  onNotes: (notes: string) => void; onRepeat: () => void; onFollowUp: () => void }) {
  const [time, setTime] = useState(session?.elapsedMs ?? -1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [filter, setFilter] = useState('all')
  const [panel, setPanel] = useState('results')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [cameraKey, setCameraKey] = useState(0)
  const last = useRef(0)
  useEffect(() => { setTime(session?.elapsedMs ?? -1); setNotes(session?.notes ?? ''); setPlaying(false); setPanel('results') }, [session?.id])
  useEffect(() => {
    if (!playing || !session) return
    last.current = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now(), delta = now - last.current; last.current = now
      setTime(current => Math.min(session.elapsedMs, Math.max(0, current) + delta * speed))
    }, 100)
    return () => window.clearInterval(timer)
  }, [playing, speed, session?.id])
  useEffect(() => { if (session && time >= session.elapsedMs) setPlaying(false) }, [time, session?.elapsedMs])
  if (!session) return <Empty icon="fact_check" title="No drill selected">Run a drill or open a saved drill from the Scenario Library to inspect its timeline and results.</Empty>
  const view = replayState(session, time)
  const score = drillScore(session)
  const events = session.events.filter(e => filter === 'all' || e.kind === filter)
  const currentEvent = [...events].reverse().find(event => event.atMs <= time)?.id
  const inspect = (at: number) => { setTime(at); setPlaying(false) }
  const previous = [...session.events].reverse().find(event => event.atMs < time)
  const next = session.events.find(event => event.atMs > time)
  const path = [nodePoint(session.scenario.startingNode), ...session.events.filter(e => e.kind === 'movement' && e.success && e.node && e.atMs <= time).map(e => nodePoint(e.node!))]
  const people = session.participants.map(p => p.name).join(', ')
  const tabs = [['results', 'Results'], ['events', 'Events'], ['notes', 'Notes']]
  return <div className={'sys-debrief' + (inspectorOpen ? '' : ' sys-review-focused')}>
    <header className="sys-review-heading">
      <div className="sys-review-title"><h1 title={session.scenario.title}>{session.scenario.title}</h1>
        <span title={session.scenario.code + ' · v' + session.scenario.version + ' · ' + people}>{session.scenario.code} · v{session.scenario.version} · {people}</span></div>
      <div className="sys-actions">
        <Button tone="tool" icon="download" title="Export record" aria-label="Export record" onClick={() => downloadSession(session)} />
        <Button tone="primary" icon="play_arrow" onClick={onRepeat}>Repeat drill</Button>
      </div>
    </header>
    <div className="sys-review-body">
      <section className="sys-replay-scene" aria-label="Drill replay">
        <header className="editor-header"><span>Replay</span><div className="sys-actions">
          <Badge>{time < 0 ? 'Baseline' : duration(time)}</Badge>
          <Button tone="tool" icon="filter_center_focus" title="Frame replay scene" onClick={() => setCameraKey(value => value + 1)} />
          <Button tone="tool" icon="tune" title={inspectorOpen ? 'Hide review panel' : 'Show review panel'} aria-expanded={inspectorOpen}
            aria-controls="review-inspector" onClick={() => setInspectorOpen(!inspectorOpen)} />
        </div></header>
        <div className={'viewport-stage ' + (data.preferences.showGrid ? '' : 'grid-hidden')}>
          <MineScene key={cameraKey} phase={view.phase} scenario={session.scenario.hazard} viewStyle={data.preferences.viewStyle}
            showRoutes={data.preferences.showRoutes} showLabels={data.preferences.showLabels} playerPosition={view.position}
            playerLabel={session.participants[0]?.name} trail={path} routeSegments={sceneRoutes(session.scenario, view.phase)} cameraTarget={[0, 0, 1]} />
          <div className="viewport-overlay top-left"><strong>{session.scenario.area}</strong></div>
        </div>
        <div className="sys-replay-controls" aria-label="Replay controls">
          <div className="sys-replay-transport">
            <Button tone="tool" icon="first_page" title="Inspect baseline" onClick={() => inspect(-1)} />
            <Button tone="tool" icon="skip_previous" title="Previous recorded event" onClick={() => inspect(previous?.atMs ?? -1)} />
            <Button tone="tool" icon={playing ? 'pause' : 'play_arrow'} title={playing ? 'Pause replay' : 'Play replay'} disabled={!session.events.length || !session.elapsedMs}
              onClick={() => { if (!playing && time >= session.elapsedMs) setTime(0); setPlaying(!playing) }} />
            <Button tone="tool" icon="skip_next" title="Next recorded event" onClick={() => inspect(next?.atMs ?? session.elapsedMs)} />
          </div>
          <input aria-label="Replay time" type="range" min={-1} max={Math.max(1, session.elapsedMs)} step={1} value={time} onChange={e => inspect(Number(e.target.value))} />
          <span>{duration(Math.max(0, time))} / {duration(session.elapsedMs)}</span>
          <select aria-label="Replay speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.5, 1, 2, 4].map(value => <option key={value} value={value}>{value}×</option>)}</select>
        </div>
      </section>
      {inspectorOpen && <aside className="sys-review-inspector" id="review-inspector" aria-label="Drill review details">
        <nav className="sys-review-tabs" role="tablist" aria-label="Review details" onKeyDown={event => {
          const index = tabs.findIndex(([id]) => id === panel)
          const at = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
          if (at < 0) return
          event.preventDefault(); setPanel(tabs[at][0]); (event.currentTarget.querySelectorAll('button')[at] as HTMLButtonElement).focus()
        }}>{tabs.map(([id, label]) => <button key={id} role="tab" id={'review-tab-' + id} aria-controls={'review-panel-' + id}
          aria-selected={panel === id} tabIndex={panel === id ? 0 : -1} onClick={() => setPanel(id)}>
          {label}{id === 'notes' && notes !== session.notes && <span className="sys-unsaved-dot" aria-label="Unsaved notes" />}
        </button>)}</nav>
        <section className="sys-review-summary" role="tabpanel" id="review-panel-results" aria-labelledby="review-tab-results" hidden={panel !== 'results'} tabIndex={0}>
          <div className="sys-result-heading"><Badge tone={session.outcome === 'Refuge reached' ? 'safe' : 'warning'}>{session.earlierRecord ? 'Earlier record' : session.status === 'complete' ? session.outcome : 'Paused drill'}</Badge>
            <strong className={score === null ? 'sys-unscored' : undefined}>{score === null ? 'Observation record' : score + '%'}</strong><span>{score === null ? 'Instructor observations retained' : 'Drill score'}</span></div>
          <div className="sys-stat-grid"><div><span>Active time</span><strong>{duration(session.elapsedMs)}</strong></div><div><span>Withdrawn-route attempts</span><strong>{session.mistakes}</strong></div></div>
          {score !== null && <><h3>Required trainee actions</h3>{session.scenario.requiredActions.map(key => <div className="sys-result-line" key={key}>
            <Icon name={session.decisions[key] === null ? 'radio_button_unchecked' : 'check_circle'} /><span>{ACTION_NAMES[key]}<small>{duration(session.decisions[key])}</small></span></div>)}</>}
          <h3>Instructor observations</h3>
          {Object.entries(OBSERVATION_NAMES).map(([key, label]) => <div className="sys-result-line" key={key}>
            <Icon name={session.observations[key as keyof typeof OBSERVATION_NAMES] === null ? 'radio_button_unchecked' : 'check_circle'} /><span>{label}<small>{duration(session.observations[key as keyof typeof OBSERVATION_NAMES])}</small></span></div>)}
          {score !== null && <details className="sys-score-explanation"><summary>How the score is calculated</summary><p className="sys-muted">Completed required actions, less {session.scenario.mistakePenalty} points per withdrawn-route attempt. Instructor observations do not add points.</p></details>}
          <dl className="sys-review-metadata"><div><dt>Instructor</dt><dd>{session.instructor}</dd></div><div><dt>Recorded</dt><dd>{dateLabel(session.createdAt)}</dd></div><div><dt>Participants</dt><dd>{people}</dd></div></dl>
        </section>
        <section className="sys-review-events" role="tabpanel" id="review-panel-events" aria-labelledby="review-tab-events" hidden={panel !== 'events'}>
          <header><span>{events.length} events</span><select aria-label="Filter event log" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All events</option>{['phase', 'decision', 'movement', 'control', 'observation'].map(kind => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></header>
          <div className="sys-review-event-list">{events.map(event => <button key={event.id} className={event.id === currentEvent ? 'current' : ''}
            aria-current={event.id === currentEvent ? 'step' : undefined} onClick={() => inspect(event.atMs)}>
            <time>{duration(event.atMs)}</time><span><strong>{event.title}</strong><span>{event.detail}</span><small>{event.actor}</small></span>
          </button>)}{!events.length && <p className="sys-muted sys-padded">No events match this filter.</p>}</div>
        </section>
        <section className="sys-review-notes" role="tabpanel" id="review-panel-notes" aria-labelledby="review-tab-notes" hidden={panel !== 'notes'}>
          <div className="sys-review-notes-body"><label htmlFor="review-notes">Learning points & next steps</label>
            <textarea id="review-notes" aria-label="Debrief notes" maxLength={20000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record the points to practise next time." />
            {session.scenario.sourceIncident && <div className="sys-review-source"><span>Source incident · {session.scenario.sourceIncident.reference}</span><p>{session.scenario.sourceIncident.lessons}</p></div>}
          </div>
          <footer><Button tone="primary" icon="save" disabled={notes === session.notes} onClick={() => onNotes(notes)}>Save notes</Button>
            <Button icon="copy" disabled={!session.notes.trim() || notes !== session.notes} onClick={onFollowUp}>Create follow-up</Button></footer>
        </section>
      </aside>}
    </div>
  </div>
}

export function Reports({ data, onOpenSession }: { data: TrainingData; onOpenSession: (session: TrainingSession) => void }) {
  const [person, setPerson] = useState('all'), [scenario, setScenario] = useState('all'), [status, setStatus] = useState('complete')
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const people = new Map(data.sessions.flatMap(s => s.participants).map(p => [p.id, p.name]))
  const scenarios = new Map(data.sessions.map(s => [s.scenario.id, s.scenario.title]))
  const records = [...data.sessions].filter(s => s.events.length && (status === 'all' || s.status === status)
    && (person === 'all' || s.participants.some(p => p.id === person))
    && (scenario === 'all' || s.scenario.id === scenario)
    && (!from || s.createdAt >= new Date(from + 'T00:00:00').getTime())
    && (!to || s.createdAt <= new Date(to + 'T23:59:59.999').getTime())).sort((a, b) => b.createdAt - a.createdAt)
  const scores = records.filter(s => s.status === 'complete').map(drillScore).filter((n): n is number => n !== null)
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const outcomes = ['Refuge reached', 'Ended early', 'Time limit reached', 'Earlier drill'].map(label => ({ label, count: records.filter(s => s.outcome === label).length }))
  const badDates = Boolean(from && to && from > to)
  return <div className="sys-records-page sys-reports-page">
    <header className="sys-page-heading"><div><span className="section-kicker">{data.preferences.organisation || 'TRAINING RECORDS'}</span><h1>Reports</h1><p>Results are calculated from saved drills and the filters below.</p></div>
      <div className="sys-actions"><Button icon="download" disabled={badDates || !records.length} onClick={() => download('MineSafe-training-report.csv', sessionsCsv(records), 'text/csv;charset=utf-8')}>Export CSV</Button>
        <Button tone="primary" icon="print" disabled={badDates || !records.length} onClick={() => window.print()}>Print report</Button></div></header>
    <div className="sys-filter-bar sys-report-filters"><select aria-label="Report trainee filter" value={person} onChange={e => setPerson(e.target.value)}><option value="all">All participants</option>{[...people].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select aria-label="Report scenario filter" value={scenario} onChange={e => setScenario(e.target.value)}><option value="all">All scenarios</option>{[...scenarios].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select aria-label="Report status filter" value={status} onChange={e => setStatus(e.target.value)}><option value="complete">Ended drills</option><option value="all">All recorded drills</option></select>
      <Field label="From"><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field><Field label="To"><input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
      <Button onClick={() => { setPerson('all'); setScenario('all'); setStatus('complete'); setFrom(''); setTo('') }}>Clear filters</Button></div>
    {badDates && <Errors messages={['The end date must be on or after the start date.']} />}
    <div className="sys-report-content">
      <div className="sys-metrics">
        <div><span>Recorded drills</span><strong>{records.length}</strong></div><div><span>Refuge reached</span><strong>{records.filter(s => s.outcome === 'Refuge reached').length}</strong></div>
        <div><span>Average drill score</span><strong>{average === null ? '—' : average + '%'}</strong></div><div><span>Participants trained</span><strong>{new Set(records.flatMap(s => s.participants.map(p => p.id))).size}</strong></div>
      </div>
      <div className="sys-report-panels"><Panel title="Drill outcomes"><div className="sys-outcome-bars">{outcomes.map(outcome => <div key={outcome.label}><span>{outcome.label}</span><div><i style={{ width: outcome.count / Math.max(1, records.length) * 100 + '%' }} /></div><strong>{outcome.count}</strong></div>)}</div></Panel>
        <Panel title="Review points"><dl className="sys-key-values"><div><dt>Withdrawn-route attempts</dt><dd>{records.reduce((total, s) => total + s.mistakes, 0)}</dd></div>
          <div><dt>Ended drills without refuge completion</dt><dd>{records.filter(s => s.status === 'complete' && s.outcome !== 'Refuge reached' && s.outcome !== 'Earlier drill').length}</dd></div>
          <div><dt>Records with debrief notes</dt><dd>{records.filter(s => s.notes.trim()).length}</dd></div>
          <div><dt>Total active training time</dt><dd>{duration(records.reduce((total, s) => total + s.elapsedMs, 0))}</dd></div></dl></Panel></div>
      {records.length ? <table className="sys-table"><thead><tr><th>Date</th><th>Scenario / area</th><th>Participants</th><th>Outcome</th><th>Score</th><th>Time</th><th>Review</th></tr></thead><tbody>{records.map(s => <tr key={s.id}>
        <td>{dateLabel(s.createdAt)}</td><td>{s.scenario.title}<small>{s.scenario.area} · v{s.scenario.version}</small></td><td>{s.participants.map(p => p.name).join(', ')}</td>
        <td>{s.status === 'complete' ? s.outcome : 'Paused drill'}</td><td>{s.status === 'complete' && drillScore(s) !== null ? drillScore(s) + '%' : '—'}</td><td>{duration(s.elapsedMs)}</td>
        <td><Button tone="tool" icon="arrow" title="Open drill review" onClick={() => onOpenSession(s)} /></td></tr>)}</tbody></table>
        : <Empty icon="bar_chart" title="No drills in this report">Complete a drill or adjust the date and participant filters. Report values come from your saved records.</Empty>}
    </div>
  </div>
}

export function Settings({ data, onPreferences, onImport, notify }: { data: TrainingData; onPreferences: (preferences: Preferences) => void;
  onImport: (incoming: TrainingData) => void; notify: (message: string) => void }) {
  const [overrides, setOverrides] = useState<Partial<Preferences>>({})
  const preferences = { ...data.preferences, ...overrides }
  const setPreferences = (change: Partial<Preferences>) => setOverrides(previous => ({ ...previous, ...change }))
  const [incoming, setIncoming] = useState<TrainingData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [storage, setStorage] = useState('')
  useEffect(() => { void navigator.storage?.estimate?.().then(e => setStorage(((e.usage ?? 0) / 1024 / 1024).toFixed(2) + ' MB used by this origin')).catch(() => {}) }, [])
  const merge = useMemo(() => incoming ? mergeData(data, incoming) : null, [incoming, data])
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try { if (file.size > 25 * 1024 * 1024) throw new Error('Use a backup smaller than 25 MB.'); setIncoming(parseBackup(await file.text())); setErrors([]) }
    catch (reason) { setErrors([reason instanceof Error ? reason.message : 'The backup could not be read.']) }
  }
  return <div className="sys-settings-page">
    <header className="sys-page-heading"><div><span className="section-kicker">WORKSPACE</span><h1>Settings & backups</h1><p>Manage instructor defaults, display aids and your saved training records.</p></div></header>
    <div className="sys-settings-grid"><Panel title="Instructor defaults">
      <Field label="Default instructor"><input maxLength={160} value={preferences.instructor} onChange={e => setPreferences({ instructor: e.target.value })} /></Field>
      <Field label="Organisation"><input maxLength={200} value={preferences.organisation} onChange={e => setPreferences({ organisation: e.target.value })} /></Field>
      <label className="sys-check"><input type="checkbox" checked={preferences.autoEvents} onChange={e => setPreferences({ autoEvents: e.target.checked })} />Use timed scenario events for new drills</label>
      <h3>Display aids</h3>{([['showRoutes', 'Route guidance'], ['showLabels', 'Scene labels'], ['showGrid', 'Viewport grid'], ['showWarnings', 'Hazard banner']] as const).map(([key, label]) =>
        <label className="sys-check" key={key}><input type="checkbox" checked={preferences[key]} onChange={e => setPreferences({ [key]: e.target.checked })} />{label}</label>)}
      <Field label="Scene display"><select value={preferences.viewStyle} onChange={e => setPreferences({ viewStyle: e.target.value as Preferences['viewStyle'] })}><option value="solid">Solid</option><option value="wireframe">Wireframe</option><option value="rendered">Rendered</option></select></Field>
      <Button tone="primary" icon="save" onClick={() => { onPreferences(preferences); setOverrides({}); notify('Workspace preferences saved') }}>Save preferences</Button>
    </Panel><Panel title="Workspace backup">
      <p>Your records are saved in this browser on this computer. A backup includes incidents, scenarios, trainees, drill history and preferences.</p>
      <Button tone="primary" icon="download" onClick={() => downloadBackup(data)}>Download workspace backup</Button>
      <h3>Import a backup</h3><p className="sys-muted">Import merges new records. Existing IDs and employee numbers are retained rather than overwritten.</p>
      <label className="sys-file-button"><Icon name="upload" />Choose workspace backup<input type="file" accept=".json,application/json" aria-label="Import workspace backup" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = '' }} /></label>
      <Errors messages={errors} />
      <h3>Local storage</h3><p className="sys-muted">{storage || 'Browser-managed local database'}<br />Use the same browser and localhost address to reopen this workspace.</p>
      <Button icon="save" onClick={() => { void (navigator.storage?.persist?.() ?? Promise.resolve(false)).then(granted => notify(granted ? 'Persistent storage granted by the browser' : 'Persistent storage was not granted. Keep regular backup exports.')) }}>Request persistent storage</Button>
    </Panel></div>
    {incoming && merge && <Modal title="Import workspace records" onClose={() => setIncoming(null)}>
      <p><strong>{merge.added}</strong> new records will be added. <strong>{merge.skipped}</strong> existing or conflicting records will be kept as they are.</p>
      <dl className="sys-key-values"><div><dt>Scenarios in backup</dt><dd>{incoming.scenarios.length}</dd></div><div><dt>Incidents</dt><dd>{incoming.incidents.length}</dd></div><div><dt>Trainees</dt><dd>{incoming.trainees.length}</dd></div><div><dt>Drills</dt><dd>{incoming.sessions.length}</dd></div></dl>
      <footer className="sys-dialog-actions"><Button onClick={() => setIncoming(null)}>Cancel</Button><Button tone="primary" icon="upload" onClick={() => { onImport(incoming); setIncoming(null) }}>Merge records</Button></footer>
    </Modal>}
  </div>
}
