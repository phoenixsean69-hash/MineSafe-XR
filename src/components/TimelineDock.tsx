import Icon from './Icon'
import type { DrillPhase } from '../types'
import type { DrillSession } from '../session'
import { PHASES, getEvents } from '../types'
import { formatDuration } from '../session'

type Props = {
  session: DrillSession
  phase: DrillPhase
  preview: boolean
  reviewing: boolean
  onPhase: (phase: DrillPhase) => void
  onPrevious: () => void
  onPlayPause: () => void
  onNext: () => void
  onEnd: () => void
}

export default function TimelineDock(props: Props) {
  const events = getEvents(props.session.scenario)
  const phaseIndex = PHASES.indexOf(props.phase)
  const titles = ['Ready', 'Alarm', 'Route loss', 'Reroute', 'End']
  const hasNextRecorded = props.session.events.some(event => event.kind === 'phase' && PHASES.indexOf(event.phase) > phaseIndex)
  return (
    <section className="timeline-editor" aria-label="Exercise timeline">
      <div className="timeline-toolbar">
        <span className="timeline-title">{props.preview ? 'Scenario preview' : props.reviewing ? 'Review recorded events' : 'Exercise events'}</span>
        <div className="playback-controls">
          <button onClick={() => props.onPhase('idle')} title="Inspect baseline"><Icon name="first_page" /></button>
          <button onClick={props.onPrevious} title="Inspect previous phase" disabled={phaseIndex === 0}><Icon name="skip_previous" /></button>
          <button onClick={props.onPlayPause} className="play-control" disabled={props.preview || props.reviewing}
            title={props.session.status === 'running' ? 'Pause drill' : props.session.status === 'complete' ? 'New drill' : 'Start or resume drill'}>
            <Icon name={props.session.status === 'running' ? 'pause' : 'play_arrow'} filled />
          </button>
          <button onClick={props.onNext} title={props.reviewing || props.preview ? 'Inspect next phase' : 'Introduce next event'}
            disabled={props.reviewing && !hasNextRecorded || !props.preview && !props.reviewing && props.session.status !== 'running' || props.phase === 'complete'}><Icon name="skip_next" /></button>
          <button onClick={props.onEnd} title={props.reviewing ? 'Inspect final recorded phase' : 'End current drill'}
            disabled={props.preview || !props.reviewing && (props.session.status === 'ready' || props.session.status === 'complete')}><Icon name="last_page" /></button>
        </div>
        <div className="frame-readout">{props.preview ? 'Preview only' : props.reviewing ? 'Session record unchanged' : 'Manual observations'}</div>
      </div>
      <div className="timeline-track">
        <div className="track-line" />
        {events.map((event, index) => {
          const recorded = props.session.events.find(item => item.kind === 'phase' && item.phase === event.phase)
          const reached = event.phase === 'idle' || Boolean(recorded)
          return <button key={event.phase}
            className={'timeline-marker ' + (reached ? 'reached tone-' + event.tone : '') + (event.phase === props.phase ? ' current' : '')}
            style={{ left: (index / (events.length - 1)) * 100 + '%' }}
            disabled={!props.preview && !reached} onClick={() => props.onPhase(event.phase)}
            title={event.title + (props.preview ? ' · preview' : recorded ? ' · ' + formatDuration(recorded.elapsedMs) : ' · not recorded')}>
            <i /><span>{titles[index]}</span>
          </button>
        })}
        <div className="playhead" style={{ left: phaseIndex / (events.length - 1) * 100 + '%' }} />
      </div>
      <div className="event-strip">
        {props.preview ? <span className="timeline-note">Previewing a phase does not add an event or mark a trainee action.</span>
          : props.session.events.length ? props.session.events.slice(-3).map(event =>
            <button key={event.id} className={'event-chip tone-' + (event.kind === 'observation' ? 'safe' : 'neutral')}
              onClick={() => props.onPhase(event.phase)}><span>{formatDuration(event.elapsedMs)}</span><strong>{event.title}</strong></button>)
            : <span className="timeline-note">Start a drill to record events and instructor observations.</span>}
      </div>
    </section>
  )
}
