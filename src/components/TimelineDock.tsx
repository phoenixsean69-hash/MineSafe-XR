import Icon from './Icon'
import type { DrillPhase, ScenarioKind } from '../types'
import { PHASES, PHASE_TIME, getEvents } from '../types'

type Props = {
  scenario: ScenarioKind
  phase: DrillPhase
  autoRun: boolean
  onPhase: (phase: DrillPhase) => void
  onReset: () => void
  onPrevious: () => void
  onPlayPause: () => void
  onNext: () => void
  onEnd: () => void
}

export default function TimelineDock(props: Props) {
  const events = getEvents(props.scenario)
  const phaseIndex = PHASES.indexOf(props.phase)
  const elapsed = PHASE_TIME[props.phase]

  return (
    <section className="timeline-editor">
      <div className="timeline-toolbar">
        <span className="timeline-title">Exercise timeline</span>

        <div className="playback-controls">
          <button onClick={props.onReset} title="Jump to start"><Icon name="first_page" /></button>
          <button onClick={props.onPrevious} title="Previous event"><Icon name="skip_previous" /></button>
          <button onClick={props.onPlayPause} className="play-control" title={props.autoRun ? 'Pause' : 'Play'}>
            <Icon name={props.autoRun ? 'pause' : 'play_arrow'} filled />
          </button>
          <button onClick={props.onNext} title="Next event" disabled={props.phase === 'complete'}><Icon name="skip_next" /></button>
          <button onClick={props.onEnd} title="Jump to end"><Icon name="last_page" /></button>
        </div>

        <div className="frame-readout">00:{String(elapsed).padStart(2, '0')} / 00:36</div>
      </div>

      <div className="timeline-track">
        <div className="track-line" />
        {events.map((event, index) => {
          const reached = index <= phaseIndex

          return (
            <button
              key={event.phase}
              className={`timeline-marker ${reached ? `reached tone-${event.tone}` : ''} ${event.phase === props.phase ? 'current' : ''}`}
              style={{ left: `${(index / (events.length - 1)) * 100}%` }}
              onClick={() => props.onPhase(event.phase)}
              title={`${event.time} - ${event.title}`}
            >
              <i />
              <span>{event.time}</span>
            </button>
          )
        })}
        <div className="playhead" style={{ left: `${Math.min((elapsed / 36) * 100, 100)}%` }} />
      </div>

      <div className="event-strip">
        {events.slice(0, phaseIndex + 1).slice(-3).map((event) => (
          <button
            key={event.phase}
            className={`event-chip tone-${event.tone}`}
            onClick={() => props.onPhase(event.phase)}
          >
            <span>{event.time}</span>
            <strong>{event.title}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}