import { useEffect, useState } from 'react'
import MineScene from '../components/MineScene'
import Icon from '../components/Icon'
import type { DrillPhase, ScenarioKind } from '../types'
import type { Participant, Scenario, TrainingData } from './types'
import { ACTION_NAMES, EDGES, HAZARDS, NODES } from './types'
import { copy, makeScenario, scenarioErrors, sceneRoutes, uid } from './model'
import { Badge, Button, Errors, Field, Panel } from './ui'

type RunProps = {
  scenario: Scenario; data: TrainingData; onPrepare: (scenario: Scenario, participants: Participant[], instructor: string, automatic: boolean, start: boolean) => void
  onAddTrainee: () => void; startImmediately?: boolean
}
export function RunForm({ scenario, data, onPrepare, onAddTrainee, startImmediately = false }: RunProps) {
  const [selected, setSelected] = useState<string[]>(() => data.sessions.find(s => s.id === data.activeSessionId)?.participants.map(p => p.id) ?? [])
  const [instructor, setInstructor] = useState(data.preferences.instructor)
  const [automatic, setAutomatic] = useState(data.preferences.autoEvents)
  const [errors, setErrors] = useState<string[]>([])
  const trainees = data.trainees.filter(t => t.active)
  const prepare = () => {
    const chosen = trainees.filter(t => selected.includes(t.id))
    const messages = []
    if (scenario.status !== 'ready') messages.push('Save this scenario as ready before preparing a drill.')
    if (!chosen.length) messages.push('Select at least one trainee.')
    if (!instructor.trim()) messages.push('Enter the instructor name.')
    if (chosen.length > 50) messages.push('Use a maximum of 50 participants per drill.')
    setErrors(messages)
    if (!messages.length) onPrepare(scenario, chosen.map(({ id, name, employeeNumber, department }) => ({ id, name, employeeNumber, department })), instructor.trim(), automatic, startImmediately)
  }
  return <div className="sys-run-form">
    <Field label="Instructor"><input value={instructor} maxLength={160} onChange={e => setInstructor(e.target.value)} placeholder="Instructor name" /></Field>
    <div className="sys-label-row"><span>Participants</span><Button tone="tool" icon="add" title="Add trainee" onClick={onAddTrainee} /></div>
    {trainees.length ? <div className="sys-participant-picker">{trainees.map(t => <label className="sys-check" key={t.id}><input type="checkbox" checked={selected.includes(t.id)}
      onChange={e => setSelected(e.target.checked ? [...selected, t.id] : selected.filter(id => id !== t.id))} /><span>{t.name}<small>{t.employeeNumber || t.department}</small></span></label>)}</div>
      : <div className="sys-compact-empty"><p>No active trainee records yet.</p><Button icon="add" onClick={onAddTrainee}>Add trainee</Button></div>}
    <label className="sys-check"><input type="checkbox" checked={automatic} onChange={e => setAutomatic(e.target.checked)} />Timed scenario events</label>
    <p className="sys-muted">Manual mode lets the instructor introduce each event. Trainee choices and movement are always recorded from input.</p>
    <Errors messages={errors} />
    <Button tone="primary" icon="play_arrow" onClick={prepare} disabled={scenario.status !== 'ready'}>{startImmediately ? 'Start configured drill' : 'Prepare drill'}</Button>
  </div>
}

type Props = {
  scenario: Scenario; data: TrainingData; onSave: (scenario: Scenario) => void; onSelect: (id: string) => void
  onPrepare: RunProps['onPrepare']; onAddTrainee: () => void; notify: (text: string) => void; onDirty: (dirty: boolean) => void
}
export function ScenarioSetup({ scenario, data, onSave, onSelect, onPrepare, onAddTrainee, notify, onDirty }: Props) {
  const [draft, setDraft] = useState(() => copy(scenario))
  const [section, setSection] = useState('brief')
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [errors, setErrors] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [showRoutes, setShowRoutes] = useState(true)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => {
    if (!dirty) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])
  useEffect(() => { setDraft(copy(scenario)); setErrors([]); setDirty(false) }, [scenario.id, scenario.updatedAt])
  const patch = (values: Partial<Scenario>) => { setDraft(current => ({ ...current, ...values })); setDirty(true) }
  const save = (status: 'draft' | 'ready') => {
    const messages = scenarioErrors(draft)
    const code = scenario.builtIn && draft.code === scenario.code ? makeScenario(draft.hazard).code : draft.code.trim()
    if (data.scenarios.some(s => s.id !== draft.id && s.code.toLowerCase() === code.toLowerCase())) messages.push('Use a unique scenario code.')
    setErrors(messages)
    if (messages.length) return
    const next = { ...copy(draft), title: draft.title.trim(), area: draft.area.trim(), code, status,
      version: scenario.builtIn ? 1 : scenario.version + 1, builtIn: false,
      id: scenario.builtIn ? uid('scenario') : draft.id, updatedAt: Date.now(), createdAt: scenario.builtIn ? Date.now() : scenario.createdAt }
    onSave(next); onSelect(next.id); setDraft(next); setDirty(false); notify(status === 'ready' ? 'Scenario saved and ready for training' : 'Scenario draft saved')
  }
  const saved = data.scenarios.find(s => s.id === draft.id) ?? scenario
  return <div className="sys-editor-layout">
    <aside className="sys-editor-tree">
      <div className="editor-header"><span>Scenario setup</span><Badge tone={dirty ? 'warning' : ''}>{dirty ? 'Unsaved' : saved.status}</Badge></div>
      <div className="sys-scenario-summary"><span>{draft.code} · v{draft.version}</span><h2>{draft.title}</h2><p>{draft.area}</p></div>
      <nav className="sys-section-nav">{[
        ['brief', 'file', 'Training brief'], ['hazard', 'warning', 'Hazards & timing'], ['routes', 'route', 'Routes & movement'],
        ['assessment', 'fact_check', 'Assessment'], ['run', 'group', 'Assign & run'],
      ].map(([id, icon, label]) => <button key={id} className={section === id ? 'selected' : ''} onClick={() => setSection(id)}><Icon name={icon} />{label}</button>)}</nav>
      {draft.sourceIncident && <div className="sys-source-note"><span className="section-title">Source incident</span><strong>{draft.sourceIncident.reference}</strong><p>{draft.sourceIncident.title}</p><small>{draft.sourceIncident.occurredOn}</small></div>}
      <div className="sys-source-note"><span className="section-title">Scenario snapshot</span><p>Each drill keeps the version used when it was prepared. Editing this scenario will not change saved results.</p></div>
    </aside>
    <section className="sys-preview">
      <header className="editor-header"><span>Training layout preview</span><div className="sys-actions">
        <Button tone="tool" icon="route" title="Toggle preview route guidance" className={showRoutes ? 'selected' : ''} onClick={() => setShowRoutes(!showRoutes)} />
        <Badge>Preview only</Badge></div></header>
      <div className="viewport-stage">
        <MineScene phase={phase} scenario={draft.hazard} viewStyle={data.preferences.viewStyle} showRoutes={showRoutes} showLabels={data.preferences.showLabels} playerPosition={NODES.find(n => n.id === draft.startingNode)?.position} routeSegments={sceneRoutes(draft, phase)} />
        <div className="viewport-overlay top-left"><strong>{draft.area}</strong><span>Shared underground training layout</span></div>
        <div className="sys-preview-phases">{([['idle', 'Baseline'], ['alarm', 'Hazard'], ['blocked', 'Route loss'], ['reroute', 'Alternate']] as [DrillPhase, string][]).map(([value, label]) =>
          <Button key={value} className={phase === value ? 'selected' : ''} onClick={() => setPhase(value)}>{label}</Button>)}</div>
      </div>
    </section>
    <aside className="sys-editor-properties">
      <header className="editor-header"><span>{section === 'brief' ? 'Training brief' : section === 'hazard' ? 'Hazards & timing' : section === 'routes' ? 'Routes & movement' : section === 'assessment' ? 'Assessment' : 'Assign & run'}</span><Icon name="tune" /></header>
      <div className="sys-editor-form">
        {section === 'brief' && <>
          <div className="sys-inline-fields"><Field label="Scenario code"><input maxLength={180} value={draft.code} onChange={e => patch({ code: e.target.value })} /></Field>
            <Field label="Hazard type"><select value={draft.hazard} onChange={e => patch({ hazard: e.target.value as ScenarioKind })}>{Object.entries(HAZARDS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field></div>
          <Field label="Scenario title"><input maxLength={180} value={draft.title} onChange={e => patch({ title: e.target.value })} /></Field>
          <Field label="Mine area"><input maxLength={180} value={draft.area} onChange={e => patch({ area: e.target.value })} /></Field>
          <Field label="Training brief"><textarea rows={5} maxLength={20000} value={draft.brief} onChange={e => patch({ brief: e.target.value })} /></Field>
          <Field label="Learning objectives"><textarea rows={3} maxLength={20000} value={draft.objectives} onChange={e => patch({ objectives: e.target.value })} /></Field>
          <Field label="Instructor notes"><textarea rows={4} maxLength={20000} value={draft.instructorNotes} onChange={e => patch({ instructorNotes: e.target.value })} /></Field>
        </>}
        {section === 'hazard' && <>
          <p className="sys-muted">The hazard starts with the drill. These times control route withdrawal and the alternate-route introduction when timed events are enabled.</p>
          <Field label="Withdraw primary route after (seconds)"><input type="number" min={1} max={600} value={draft.routeLossSeconds} onChange={e => patch({ routeLossSeconds: Number(e.target.value) })} /></Field>
          <Field label="Introduce alternate route after (seconds)"><input type="number" min={1} max={900} value={draft.alternateSeconds} onChange={e => patch({ alternateSeconds: Number(e.target.value) })} /></Field>
          <Field label="Drill time limit (seconds)"><input type="number" min={15} max={3600} value={draft.timeLimitSeconds} onChange={e => patch({ timeLimitSeconds: Number(e.target.value) })} /></Field>
          <div className="sys-form-section"><h3>Simulated conditions</h3>
            <Field label="Baseline airflow (m/s)"><input type="number" min={0} max={20} step={0.1} value={draft.normalAirflow} onChange={e => patch({ normalAirflow: Number(e.target.value) })} /></Field>
            <Field label="Hazard airflow (m/s)"><input type="number" min={0} max={20} step={0.1} value={draft.hazardAirflow} onChange={e => patch({ hazardAirflow: Number(e.target.value) })} /></Field>
            <Field label="Hazard visibility (%)"><input type="number" min={0} max={100} value={draft.hazardVisibility} onChange={e => patch({ hazardVisibility: Number(e.target.value) })} /></Field>
          </div>
        </>}
        {section === 'routes' && <>
          <Field label="Starting waypoint"><select value={draft.startingNode} onChange={e => patch({ startingNode: e.target.value })}>{NODES.filter(n => n.id !== 'refuge').map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></Field>
          <Field label="Refuge destination"><input value="Refuge Chamber 2" readOnly /></Field>
          <Field label="Movement speed (scene m/s)"><input type="number" min={0.5} max={4} step={0.5} value={draft.speed} onChange={e => patch({ speed: Number(e.target.value) })} /></Field>
          <h3>Route sections withdrawn during the hazard</h3>
          {EDGES.filter(e => e.route === 'primary').map(edge => <label className="sys-check" key={edge.id}><input type="checkbox" checked={draft.blockedEdges.includes(edge.id)}
            onChange={e => patch({ blockedEdges: e.target.checked ? [...draft.blockedEdges, edge.id] : draft.blockedEdges.filter(id => id !== edge.id) })} />
            {NODES.find(n => n.id === edge.from)?.name} → {NODES.find(n => n.id === edge.to)?.name}</label>)}
          <p className="sys-muted">The connected refuge route remains open. Waypoint controls move the trainee through this layout and record attempted withdrawn-route entries.</p>
        </>}
        {section === 'assessment' && <>
          <h3>Required trainee actions</h3>
          {Object.entries(ACTION_NAMES).map(([key, label]) => <label className="sys-check" key={key}><input type="checkbox" checked={draft.requiredActions.includes(key as keyof typeof ACTION_NAMES)}
            disabled={key === 'acknowledge' || key === 'refuge'} onChange={e => patch({ requiredActions: e.target.checked ? [...draft.requiredActions, key as keyof typeof ACTION_NAMES] : draft.requiredActions.filter(action => action !== key) })} />{label}</label>)}
          <Field label="Penalty per withdrawn-route attempt (points)"><input type="number" min={0} max={30} value={draft.mistakePenalty} onChange={e => patch({ mistakePenalty: Number(e.target.value) })} /></Field>
          <p className="sys-muted">The drill score measures these recorded actions and route attempts. Instructor observation checkboxes are kept separately and do not award points.</p>
        </>}
        {section === 'run' && <>
          {dirty && <div className="sys-inline-note">Save your changes before assigning this version.</div>}
          <h3>{saved.title}</h3><p className="sys-muted">{saved.code} · v{saved.version} · {saved.status}</p>
          {!dirty && <RunForm key={saved.id + '-' + saved.version} scenario={saved} data={data} onPrepare={onPrepare} onAddTrainee={onAddTrainee} startImmediately />}
        </>}
        <Errors messages={errors} />
      </div>
      <footer className="sys-editor-footer"><Button icon="save" onClick={() => save('draft')}>Save draft</Button><Button tone="primary" icon="check" onClick={() => save('ready')}>{scenario.builtIn ? 'Save custom version' : 'Save as ready'}</Button></footer>
    </aside>
  </div>
}
