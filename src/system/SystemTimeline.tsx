import type { Page, TrainingSession } from './types'
import { activeTime, duration } from './model'
import { Button } from './ui'
import { PHASES } from '../types'

export function SystemTimeline({ session, page, now, expanded, onToggleExpanded, onStartPause, onNext, onEnd, onReview }: {
  session: TrainingSession | null; page: Page; now: number
  expanded: boolean; onToggleExpanded: () => void
  onStartPause: () => void; onNext: () => void; onEnd: () => void; onReview: () => void
}) {
  const running = session?.status === 'running'
  const interactive = page === 'Drill' && session?.earlierRecord === null
  return <section className="timeline-editor sys-timeline">
    <div className="timeline-toolbar"><span className="timeline-title">{page === 'Drill' ? 'Exercise events' : 'Active drill record'}</span>
      <div className="playback-controls"><Button tone="tool" icon="first_page" title="Open drill review" disabled={!session?.events.length} onClick={onReview} />
        <Button tone="tool" className="play-control" icon={running ? 'pause' : 'play_arrow'} title={running ? 'Pause drill' : 'Start or resume drill'} disabled={!interactive} onClick={onStartPause} />
        <Button tone="tool" icon="skip_next" title="Introduce next event" disabled={!interactive || !running || session?.phase === 'reroute'} onClick={onNext} />
        <Button tone="tool" icon="last_page" title="End current drill" disabled={!interactive || session?.status === 'ready' || session?.status === 'complete'} onClick={onEnd} />
      </div><div className="sys-timeline-end"><span className="frame-readout">{duration(session ? activeTime(session, now) : 0)}</span>
        <Button tone="tool" icon="expand_more" title={expanded ? 'Hide recent events' : 'Show recent events'} aria-expanded={expanded} aria-controls="recent-drill-events" className={expanded ? 'expanded' : ''} onClick={onToggleExpanded} />
      </div></div>
    <div className="timeline-track"><div className="track-line" />{PHASES.map((phase, index) => {
      const event = session?.events.find(e => e.phase === phase && (e.kind === 'phase' || phase === 'complete'))
      const reached = phase === 'idle' || Boolean(event)
      return <button key={phase} className={'timeline-marker ' + (reached ? 'reached' : '') + (session?.phase === phase ? ' current' : '')}
        style={{ left: index / (PHASES.length - 1) * 100 + '%' }} disabled={!session?.events.length || !reached} onClick={onReview}
        title={(event ? duration(event.atMs) + ' · ' : '') + ['Ready', 'Hazard introduced', 'Primary route withdrawn', 'Alternate route introduced', 'Exercise ended'][index]}>
        <i /><span>{['Ready', 'Alarm', 'Route loss', 'Reroute', 'End'][index]}</span></button>
    })}</div>
    {expanded && <div className="event-strip" id="recent-drill-events">{session?.events.length ? session.events.slice(-3).map(event => <button key={event.id} className={'event-chip ' + (event.success === false ? 'tone-danger' : event.success ? 'tone-safe' : '')} onClick={onReview}>
      <span>{duration(event.atMs)}</span><strong>{event.title}</strong></button>) : <span className="timeline-note">Prepare a scenario and assign a trainee to begin recording a drill.</span>}</div>}
  </section>
}
