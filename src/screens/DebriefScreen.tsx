import Icon from '../components/Icon'
import MineScene from '../components/MineScene'
import type { DrillPhase, ScenarioKind, ViewStyle } from '../types'
import { PHASES, PHASE_TIME, SCENARIOS, getEvents } from '../types'

type Assessment = {
  hazard: boolean
  route: boolean
  alternate: boolean
}

type Props = {
  scenario: ScenarioKind
  phase: DrillPhase
  viewStyle: ViewStyle
  showRoutes: boolean
  showLabels: boolean
  assessment: Assessment
  onPhase: (phase: DrillPhase) => void
  onReplay: () => void
  onExport: () => void
}

export default function DebriefScreen(props: Props) {
  const definition = SCENARIOS[props.scenario]
  const events = getEvents(props.scenario)
  const phaseIndex = PHASES.indexOf(props.phase)
  const recordedActions = [
    phaseIndex >= 1 || props.assessment.hazard,
    phaseIndex >= 3 || props.assessment.route,
    phaseIndex >= 3 || props.assessment.alternate,
  ].filter(Boolean).length

  return (
    <section className="debrief-screen">
      <div className="debrief-topbar">
        <div>
          <span className="section-kicker">DEBRIEF</span>
          <h2>{definition.title}</h2>
          <p>{definition.code} - Worker 017 - simulated exercise</p>
        </div>
        <div className="debrief-actions">
          <button onClick={props.onReplay}><Icon name="replay" /> Replay from start</button>
          <button onClick={props.onExport}><Icon name="download" /> Export session</button>
        </div>
      </div>

      <div className="debrief-grid">
        <section className="debrief-view">
          <div className="editor-header">
            <span>Replay viewport</span>
            <span>00:{String(PHASE_TIME[props.phase]).padStart(2, '0')} / 00:36</span>
          </div>
          <div className="viewport-stage grid-hidden">
            <MineScene
              phase={props.phase}
              scenario={props.scenario}
              viewStyle={props.viewStyle}
              showRoutes={props.showRoutes}
              showLabels={props.showLabels}
            />
          </div>
        </section>

        <aside className="debrief-summary">
          <div className="summary-block">
            <span>Exercise state</span>
            <strong>{props.phase === 'complete' ? 'Complete' : 'Reviewing'}</strong>
          </div>
          <div className="summary-grid">
            <div><span>Response time</span><strong>00:{String(PHASE_TIME[props.phase]).padStart(2, '0')}</strong></div>
            <div><span>Events reached</span><strong>{phaseIndex + 1}/5</strong></div>
            <div><span>Actions recorded</span><strong>{recordedActions}/3</strong></div>
            <div><span>Final route</span><strong>{phaseIndex >= 3 ? 'Alternate' : 'Pending'}</strong></div>
          </div>

          <div className="assessment-review">
            <h3>Trainee actions</h3>
            <div><Icon name={phaseIndex >= 1 || props.assessment.hazard ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 1 || props.assessment.hazard} /><span>Hazard recognised</span></div>
            <div><Icon name={phaseIndex >= 3 || props.assessment.route ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3 || props.assessment.route} /><span>Unsafe route rejected</span></div>
            <div><Icon name={phaseIndex >= 3 || props.assessment.alternate ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3 || props.assessment.alternate} /><span>Alternate route selected</span></div>
          </div>
        </aside>
      </div>

      <section className="event-table-wrap">
        <div className="editor-header">
          <span>Exercise event log</span>
          <span>{definition.sourceNote}</span>
        </div>
        <div className="event-table">
          <div className="event-row header">
            <span>Time</span><span>Event</span><span>Detail</span><span>Status</span>
          </div>
          {events.map((event, index) => (
            <button
              className={`event-row ${index <= phaseIndex ? 'reached' : ''}`}
              key={event.phase}
              onClick={() => props.onPhase(event.phase)}
            >
              <span>{event.time}</span>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
              <span>{index <= phaseIndex ? 'Recorded' : 'Pending'}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}