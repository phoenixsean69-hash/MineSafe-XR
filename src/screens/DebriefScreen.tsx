import Icon from '../components/Icon'
import MineScene from '../components/MineScene'
import type { DrillPhase, ViewStyle } from '../types'
import type { DrillSession, ObservationKey } from '../session'
import { SCENARIOS } from '../types'
import { formatDuration, observationDelay, OBSERVATIONS } from '../session'

type Props = {
  session: DrillSession
  phase: DrillPhase
  elapsedMs: number
  viewStyle: ViewStyle
  showRoutes: boolean
  showLabels: boolean
  onPhase: (phase: DrillPhase) => void
  onReplay: () => void
  onExport: () => void
  onNewDrill: () => void
}

export default function DebriefScreen(props: Props) {
  const { session } = props
  const definition = SCENARIOS[session.scenario]
  const recorded = Object.values(session.observations).filter(value => value !== null).length
  const phases = new Set(session.events.filter(event => event.kind === 'phase').map(event => event.phase)).size
  return (
    <section className="debrief-screen">
      <div className="debrief-topbar">
        <div>
          <span className="section-kicker">SESSION REVIEW</span>
          <h2>{definition.title}</h2>
          <p>{definition.code + ' · ' + session.config.trainee + ' · ' + session.config.area}</p>
        </div>
        <div className="debrief-actions">
          <button onClick={props.onReplay}><Icon name="replay" /> Inspect baseline</button>
          <button onClick={props.onExport} disabled={!session.events.length}><Icon name="download" /> Export session</button>
          <button onClick={props.onNewDrill}><Icon name="play_arrow" /> New drill</button>
        </div>
      </div>

      <div className="debrief-grid">
        <section className="debrief-view">
          <div className="editor-header"><span>Recorded scene states</span><span>Inspecting {props.phase}</span></div>
          <div className="viewport-stage grid-hidden">
            <MineScene phase={props.phase} scenario={session.scenario} viewStyle={props.viewStyle}
              showRoutes={props.showRoutes} showLabels={props.showLabels} />
            <div className="viewport-overlay top-left"><strong>{session.config.area}</strong><span>Review leaves the session record unchanged</span></div>
          </div>
        </section>

        <aside className="debrief-summary">
          <div className="summary-block"><span>Session status</span>
            <strong>{session.status === 'ready' ? 'No drill recorded' : session.status === 'complete' ? 'Exercise ended' : 'Paused for review'}</strong>
          </div>
          <div className="summary-grid">
            <div><span>Active drill time</span><strong>{formatDuration(props.elapsedMs)}</strong></div>
            <div><span>Observed after alarm</span><strong>{formatDuration(observationDelay(session))}</strong></div>
            <div><span>Phases recorded</span><strong>{phases}/4</strong></div>
            <div><span>Actions observed</span><strong data-testid="observations-count">{recorded}/3</strong></div>
          </div>
          <p className="field-help">Observation times are recorded when the instructor marks an action. Paused time is excluded.</p>
          <div className="assessment-review">
            <h3>Instructor observations</h3>
            {(Object.keys(OBSERVATIONS) as ObservationKey[]).map(key => {
              const value = session.observations[key]
              return <div key={key} className={value === null ? 'unrecorded' : 'observed'}>
                <Icon name={value === null ? 'radio_button_unchecked' : 'check_circle'} />
                <span>{OBSERVATIONS[key]}<small>{value === null ? 'Not recorded' : 'At ' + formatDuration(value)}</small></span>
              </div>
            })}
          </div>
          <p className="field-help">These are instructor records for a simulated drill. The scene does not automatically verify trainee decisions.</p>
        </aside>
      </div>

      <section className="event-table-wrap">
        <div className="editor-header"><span>Session event log</span><span>{session.events.length} entries · Active drill time</span></div>
        <div className="event-table">
          <div className="event-row header"><span>Time</span><span>Event</span><span>Detail</span><span>Source</span></div>
          {!session.events.length && <p className="empty-state">Start a drill to capture scenario changes and instructor observations.</p>}
          {session.events.map(event => <button className="event-row reached" key={event.id}
            onClick={() => props.onPhase(event.phase)}>
            <span>{formatDuration(event.elapsedMs)}</span><strong>{event.title}</strong><span>{event.detail}</span>
            <span>{event.kind === 'observation' ? 'Instructor' : event.kind === 'phase' ? 'Scenario' : 'Control'}</span>
          </button>)}
        </div>
      </section>
    </section>
  )
}
