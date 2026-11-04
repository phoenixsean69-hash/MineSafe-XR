import { useState } from 'react'
import type { Incident, Scenario, Trainee, TrainingData, TrainingSession } from './types'
import { HAZARDS } from './types'
import type { ScenarioKind } from '../types'
import { copy, drillScore, duration, makeScenario, uid } from './model'
import { validateIncident, validateScenario, validateTrainee } from './validation'
import { Badge, Button, dateLabel, Empty, Errors, Field, Modal } from './ui'
import { download } from './io'
import Icon from '../components/Icon'

type Shared = { data: TrainingData; notify: (message: string) => void }
function localDate() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function Trainees({ data, onSave, onOpenSession, notify, autoAdd = false, onAdded }: Shared & {
  onSave: (record: Trainee) => void; onOpenSession: (session: TrainingSession) => void; autoAdd?: boolean; onAdded: () => void
}) {
  const fresh = (): Trainee => ({ id: uid('trainee'), name: '', employeeNumber: '', department: '', role: '',
    notes: '', active: true, createdAt: Date.now(), updatedAt: Date.now() })
  const [editing, setEditing] = useState<Trainee | null>(() => autoAdd ? fresh() : null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const [errors, setErrors] = useState<string[]>([])
  const [detail, setDetail] = useState<Trainee | null>(null)
  const [archive, setArchive] = useState<Trainee | null>(null)
  const records = data.trainees.filter(t => (status === 'all' || t.active === (status === 'active'))
    && [t.name, t.employeeNumber, t.department, t.role].join(' ').toLowerCase().includes(query.toLowerCase()))
  const open = (record: Trainee) => { setEditing(copy(record)); setErrors([]) }
  const close = () => { setEditing(null); setErrors([]); onAdded() }
  const save = () => {
    if (!editing) return
    try {
      const record = validateTrainee({ ...editing, name: editing.name.trim(), employeeNumber: editing.employeeNumber.trim(), updatedAt: Date.now() })
      if (record.employeeNumber && data.trainees.some(t => t.id !== record.id && t.employeeNumber.toLowerCase() === record.employeeNumber.toLowerCase())) throw new Error('That employee number is already assigned to another trainee.')
      onSave(record); close(); notify('Trainee saved')
    } catch (reason) { setErrors([reason instanceof Error ? reason.message : 'Check the trainee details.']) }
  }
  return <div className="sys-records-page">
    <header className="sys-page-heading"><div><span className="section-kicker">PARTICIPANTS</span><h1>Trainees</h1><p>Manage participants and review their recorded drills.</p></div>
      <Button tone="primary" icon="add" onClick={() => open(fresh())}>Add trainee</Button></header>
    <div className="sys-filter-bar"><label className="sys-search"><Icon name="search" /><input aria-label="Search trainees" placeholder="Search names, employee numbers or departments" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <select aria-label="Trainee status filter" value={status} onChange={e => setStatus(e.target.value)}><option value="active">Active trainees</option><option value="inactive">Inactive trainees</option><option value="all">All trainees</option></select>
      <span>{records.length} records</span></div>
    <div className="sys-table-scroll">
      {records.length ? <table className="sys-table"><thead><tr><th>Name</th><th>Employee number</th><th>Department / role</th><th>Recorded drills</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{records.map(t => <tr key={t.id}><td><button className="sys-text-button" onClick={() => setDetail(t)}>{t.name}</button></td><td>{t.employeeNumber || '—'}</td>
          <td>{t.department || '—'}<small>{t.role}</small></td><td>{data.sessions.filter(s => s.participants.some(p => p.id === t.id) && s.status === 'complete').length}</td>
          <td><Badge tone={t.active ? 'safe' : ''}>{t.active ? 'Active' : 'Inactive'}</Badge></td>
          <td><div className="sys-actions"><Button tone="tool" icon="edit" title={'Edit ' + t.name} onClick={() => open(t)} />
            <Button tone="tool" icon="archive" title={t.active ? 'Deactivate trainee' : 'Reactivate trainee'} onClick={() => setArchive(t)} /></div></td></tr>)}</tbody></table>
        : <Empty icon="group" title={query ? 'No matching trainees' : 'Add your first trainee'} action={!query && <Button tone="primary" icon="add" onClick={() => open(fresh())}>Add trainee</Button>}>Trainee records let you assign drills and follow each participant's training history.</Empty>}
    </div>
    {editing && <Modal title={data.trainees.some(t => t.id === editing.id) ? 'Edit trainee' : 'Add trainee'} onClose={close}>
      <div className="sys-form-grid"><Field label="Full name"><input autoFocus maxLength={160} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
        <Field label="Employee number"><input maxLength={160} value={editing.employeeNumber} onChange={e => setEditing({ ...editing, employeeNumber: e.target.value })} /></Field>
        <Field label="Department"><input maxLength={160} value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })} /></Field>
        <Field label="Role"><input maxLength={160} value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} /></Field></div>
      <Field label="Trainee notes"><textarea rows={3} maxLength={10000} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></Field>
      <Errors messages={errors} /><footer className="sys-dialog-actions"><Button onClick={close}>Cancel</Button><Button tone="primary" icon="save" onClick={save}>Save trainee</Button></footer>
    </Modal>}
    {archive && <Modal title={archive.active ? 'Deactivate trainee?' : 'Reactivate trainee?'} onClose={() => setArchive(null)}>
      <p>{archive.name}'s existing drill records will be retained.</p><footer className="sys-dialog-actions"><Button onClick={() => setArchive(null)}>Cancel</Button>
        <Button tone="primary" onClick={() => { onSave({ ...archive, active: !archive.active, updatedAt: Date.now() }); setArchive(null) }}>{archive.active ? 'Deactivate' : 'Reactivate'}</Button></footer></Modal>}
    {detail && <Modal title={detail.name + ' · Training history'} wide onClose={() => setDetail(null)}>
      <p className="sys-muted">{[detail.employeeNumber, detail.department, detail.role].filter(Boolean).join(' · ')}</p>
      <div className="sys-history-list">{data.sessions.filter(s => s.participants.some(p => p.id === detail.id)).sort((a, b) => b.createdAt - a.createdAt).map(s =>
        <button key={s.id} onClick={() => { onOpenSession(s); setDetail(null) }}><span><strong>{s.scenario.title}</strong><small>{dateLabel(s.createdAt)}</small></span><Badge>{s.outcome}</Badge><span>{drillScore(s) === null ? 'Observation record' : drillScore(s) + '%'}</span><Icon name="chevron_right" /></button>)}</div>
      {!data.sessions.some(s => s.participants.some(p => p.id === detail.id)) && <p>No drills have been assigned to this trainee yet.</p>}
    </Modal>}
  </div>
}

export function Incidents({ data, onSave, onCreateScenario, notify }: Shared & { onSave: (record: Incident) => void; onCreateScenario: (record: Incident) => void }) {
  const fresh = (): Incident => ({ id: uid('incident'), reference: 'INC-' + localDate().replace(/-/g, '') + '-' + String(data.incidents.length + 1).padStart(3, '0'),
    title: '', occurredOn: localDate(), area: '', hazard: 'fire', category: 'Incident', description: '', lessons: '', source: '', reviewed: false,
    createdAt: Date.now(), updatedAt: Date.now(), archived: false })
  const [editing, setEditing] = useState<Incident | null>(null)
  const [detail, setDetail] = useState<Incident | null>(null)
  const [archive, setArchive] = useState<Incident | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('active')
  const [errors, setErrors] = useState<string[]>([])
  const records = data.incidents.filter(i => (filter === 'all' || i.archived === (filter === 'archived'))
    && [i.title, i.reference, i.area, i.description].join(' ').toLowerCase().includes(query.toLowerCase()))
  const edit = (record: Incident) => { setEditing(copy(record)); setErrors([]) }
  const save = () => {
    if (!editing) return
    try {
      const record = validateIncident({ ...editing, reference: editing.reference.trim(), title: editing.title.trim(), area: editing.area.trim(), updatedAt: Date.now() })
      if (data.incidents.some(i => i.id !== record.id && i.reference.toLowerCase() === record.reference.toLowerCase())) throw new Error('Use a unique incident reference.')
      onSave(record); setEditing(null); notify('Incident record saved')
    } catch (reason) { setErrors([reason instanceof Error ? reason.message : 'Check the incident details.']) }
  }
  return <div className="sys-records-page">
    <header className="sys-page-heading"><div><span className="section-kicker">INCIDENT TO TRAINING</span><h1>Incident records</h1><p>Record an event or near miss, then use its lessons to prepare a drill.</p></div>
      <Button tone="primary" icon="add" onClick={() => edit(fresh())}>Record incident</Button></header>
    <div className="sys-filter-bar"><label className="sys-search"><Icon name="search" /><input aria-label="Search incidents" placeholder="Search references, locations and descriptions" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <select aria-label="Incident status filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="active">Active records</option><option value="archived">Archived records</option><option value="all">All records</option></select><span>{records.length} records</span></div>
    <div className="sys-table-scroll">{records.length ? <table className="sys-table"><thead><tr><th>Reference / event</th><th>Date</th><th>Mine area</th><th>Hazard</th><th>Review</th><th>Actions</th></tr></thead>
      <tbody>{records.map(i => <tr key={i.id}><td><button className="sys-text-button" onClick={() => setDetail(i)}>{i.title}</button><small>{i.reference} · {i.category}</small></td>
        <td>{i.occurredOn}</td><td>{i.area}</td><td>{HAZARDS[i.hazard]}</td><td><Badge tone={i.reviewed ? 'safe' : 'warning'}>{i.reviewed ? 'Reviewed' : 'To review'}</Badge></td>
        <td><div className="sys-actions"><Button icon="arrow" disabled={i.archived} onClick={() => onCreateScenario(i)}>Create drill</Button>
          <Button tone="tool" icon="edit" title={'Edit ' + i.reference} onClick={() => edit(i)} /><Button tone="tool" icon="archive" title={i.archived ? 'Restore incident' : 'Archive incident'} onClick={() => setArchive(i)} /></div></td></tr>)}</tbody></table>
      : <Empty icon="file" title={query ? 'No matching incidents' : 'Turn experience into training'} action={!query && <Button tone="primary" icon="add" onClick={() => edit(fresh())}>Record incident</Button>}>Add an incident, near miss or hazard observation. The Create drill action carries the source record into an editable scenario draft.</Empty>}</div>
    {editing && <Modal title={data.incidents.some(i => i.id === editing.id) ? 'Edit incident record' : 'Record incident'} wide onClose={() => setEditing(null)}>
      <div className="sys-form-grid"><Field label="Incident reference"><input maxLength={180} value={editing.reference} onChange={e => setEditing({ ...editing, reference: e.target.value })} /></Field>
        <Field label="Event title"><input maxLength={180} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field>
        <Field label="Date of event"><input type="date" value={editing.occurredOn} onChange={e => setEditing({ ...editing, occurredOn: e.target.value })} /></Field>
        <Field label="Mine area"><input maxLength={180} value={editing.area} onChange={e => setEditing({ ...editing, area: e.target.value })} /></Field>
        <Field label="Hazard type"><select value={editing.hazard} onChange={e => setEditing({ ...editing, hazard: e.target.value as ScenarioKind })}>{Object.entries(HAZARDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Record category"><select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as Incident['category'] })}>{['Incident', 'Near miss', 'Hazard observation'].map(value => <option key={value}>{value}</option>)}</select></Field></div>
      <Field label="What happened?"><textarea rows={4} maxLength={20000} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
      <Field label="Lessons for the drill"><textarea rows={3} maxLength={20000} value={editing.lessons} onChange={e => setEditing({ ...editing, lessons: e.target.value })} /></Field>
      <Field label="Source or report reference"><input maxLength={1000} value={editing.source} onChange={e => setEditing({ ...editing, source: e.target.value })} /></Field>
      <label className="sys-check"><input type="checkbox" checked={editing.reviewed} onChange={e => setEditing({ ...editing, reviewed: e.target.checked })} />Record reviewed by the instructor</label>
      <Errors messages={errors} /><footer className="sys-dialog-actions"><Button onClick={() => setEditing(null)}>Cancel</Button><Button tone="primary" icon="save" onClick={save}>Save incident</Button></footer>
    </Modal>}
    {detail && <Modal title={detail.title} wide onClose={() => setDetail(null)}><div className="sys-detail-meta">{detail.reference} · {detail.occurredOn} · {detail.area}</div>
      <h3>What happened</h3><p className="sys-preserve">{detail.description}</p><h3>Lessons</h3><p className="sys-preserve">{detail.lessons || 'No lessons entered yet.'}</p><p className="sys-muted">Source: {detail.source || 'Not specified'}</p>
      <p>{data.scenarios.filter(s => s.sourceIncident?.id === detail.id).length} scenario drafts or versions link to this record.</p>
      <footer className="sys-dialog-actions"><Button onClick={() => setDetail(null)}>Close</Button><Button tone="primary" icon="arrow" disabled={detail.archived} onClick={() => { onCreateScenario(detail); setDetail(null) }}>Create drill draft</Button></footer></Modal>}
    {archive && <Modal title={archive.archived ? 'Restore incident?' : 'Archive incident?'} onClose={() => setArchive(null)}><p>{archive.title} will remain linked to its existing scenarios and drill records.</p>
      <footer className="sys-dialog-actions"><Button onClick={() => setArchive(null)}>Cancel</Button><Button tone="primary" onClick={() => { onSave({ ...archive, archived: !archive.archived, updatedAt: Date.now() }); setArchive(null) }}>{archive.archived ? 'Restore record' : 'Archive record'}</Button></footer></Modal>}
  </div>
}

export function Library({ data, onEdit, onPrepare, onSave, onOpenSession, notify }: Shared & {
  onEdit: (scenario: Scenario) => void; onPrepare: (scenario: Scenario) => void; onSave: (scenario: Scenario) => void; onOpenSession: (session: TrainingSession) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [hazard, setHazard] = useState('all')
  const [archive, setArchive] = useState<Scenario | null>(null)
  const [historyQuery, setHistoryQuery] = useState('')
  const records = data.scenarios.filter(s => (filter === 'all' ? s.status !== 'archived' : s.status === filter)
    && (hazard === 'all' || s.hazard === hazard) && [s.title, s.code, s.area, s.brief].join(' ').toLowerCase().includes(query.toLowerCase()))
  const clone = (s: Scenario) => { const next = { ...copy(s), id: uid('scenario'), code: makeScenario(s.hazard).code,
    title: s.title.slice(0, 173) + ' - copy', builtIn: false, version: 1, status: 'draft' as const, createdAt: Date.now(), updatedAt: Date.now() }; onSave(next); onEdit(next) }
  const importScenario = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > 1024 * 1024) throw new Error('Use a scenario file smaller than 1 MB.')
      const envelope = JSON.parse(await file.text()) as { format?: string; scenario?: unknown }
      if (!envelope || envelope.format !== 'minesafe.scenario.v2') throw new Error('Choose an exported MineSafe XR scenario file.')
      const scenario = validateScenario(envelope.scenario)
      const next = { ...copy(scenario), id: uid('scenario'), code: makeScenario(scenario.hazard).code, builtIn: false,
        status: 'draft' as const, version: 1, createdAt: Date.now(), updatedAt: Date.now() }
      onSave(next); onEdit(next); notify('Scenario imported as a new draft')
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'The scenario could not be imported.') }
  }
  const sessions = [...data.sessions].filter(s => s.events.length && [s.scenario.title, s.scenario.area, ...s.participants.map(p => p.name)].join(' ').toLowerCase().includes(historyQuery.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt)
  return <div className="sys-records-page sys-library-page">
    <header className="sys-page-heading"><div><span className="section-kicker">SCENARIO LIBRARY</span><h1>Training scenarios</h1><p>Prepare a saved scenario or turn an incident into a new drill.</p></div>
      <div className="sys-actions"><label className="sys-file-button"><Icon name="upload" />Import scenario<input type="file" accept=".json,application/json" aria-label="Import scenario" onChange={e => { void importScenario(e.target.files?.[0]); e.target.value = '' }} /></label>
        <Button tone="primary" icon="add" onClick={() => { const s = makeScenario(); onSave(s); onEdit(s) }}>New scenario</Button></div></header>
    <div className="sys-filter-bar"><label className="sys-search"><Icon name="search" /><input aria-label="Search scenarios" placeholder="Search titles, codes or mine areas" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <select aria-label="Scenario state filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Available and drafts</option><option value="ready">Ready</option><option value="draft">Drafts</option><option value="archived">Archived</option></select>
      <select aria-label="Scenario hazard filter" value={hazard} onChange={e => setHazard(e.target.value)}><option value="all">All hazards</option>{Object.entries(HAZARDS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
    <div className="sys-library-content">
      <div className="sys-scenario-list">{records.map(s => <article className="sys-scenario-card" key={s.id}><div className={'sys-hazard-icon ' + s.hazard}><Icon name={s.hazard === 'fire' ? 'local_fire_department' : s.hazard === 'rockfall' ? 'landslide' : 'air'} /></div>
        <div><div className="sys-card-heading"><span>{s.code} · v{s.version}</span><Badge tone={s.status === 'ready' ? 'safe' : 'warning'}>{s.status === 'ready' ? 'Ready' : s.status === 'draft' ? 'Draft' : 'Archived'}</Badge></div>
          <h3>{s.title}</h3><p>{s.brief}</p><div className="sys-muted">{s.area}{s.sourceIncident && ' · Incident ' + s.sourceIncident.reference}</div></div>
        <div className="sys-actions sys-card-actions"><Button icon="copy" onClick={() => clone(s)}>Duplicate</Button>
          <Button icon="edit" onClick={() => s.builtIn ? clone(s) : onEdit(s)}>{s.builtIn ? 'Customise' : 'Edit'}</Button>
          <Button tone="tool" icon="download" title="Export scenario" onClick={() => download(s.code + '.json', JSON.stringify({ format: 'minesafe.scenario.v2', scenario: s }, null, 2))} />
          {!s.builtIn && <Button tone="tool" icon="archive" title={s.status === 'archived' ? 'Restore scenario to draft' : 'Archive scenario'} onClick={() => setArchive(s)} />}
          <Button tone="primary" icon="play_arrow" disabled={s.status !== 'ready'} onClick={() => onPrepare(s)}>Prepare drill</Button></div>
      </article>)}
      {!records.length && <Empty title="No matching scenarios">Change the search filters or create a scenario.</Empty>}</div>
      <section className="sys-session-history"><header className="sys-section-heading"><h2>Saved drills</h2><input aria-label="Search saved drills" placeholder="Search trainees or scenarios" value={historyQuery} onChange={e => setHistoryQuery(e.target.value)} /></header>
        {sessions.length ? <div className="sys-history-list">{sessions.map(s => <button key={s.id} onClick={() => onOpenSession(s)}><span><strong>{s.scenario.title}</strong><small>{s.participants.map(p => p.name).join(', ')} · {dateLabel(s.createdAt)}</small></span>
          <Badge tone={s.outcome === 'Refuge reached' ? 'safe' : ''}>{s.status === 'complete' ? s.outcome : 'Paused drill'}</Badge><span>{duration(s.elapsedMs)}</span><span>{s.status === 'complete' && drillScore(s) !== null ? drillScore(s) + '%' : '—'}</span><Icon name="chevron_right" /></button>)}</div>
          : <p className="sys-muted">Drills with recorded activity appear here. Records are retained until you remove the browser's app data.</p>}
      </section>
    </div>
    {archive && <Modal title={archive.status === 'archived' ? 'Restore scenario?' : 'Archive scenario?'} onClose={() => setArchive(null)}><p>Past sessions keep their original scenario snapshot and results.</p>
      <footer className="sys-dialog-actions"><Button onClick={() => setArchive(null)}>Cancel</Button><Button tone="primary" onClick={() => { onSave({ ...archive, status: archive.status === 'archived' ? 'draft' : 'archived', updatedAt: Date.now() }); setArchive(null) }}>{archive.status === 'archived' ? 'Restore to draft' : 'Archive scenario'}</Button></footer></Modal>}
  </div>
}
