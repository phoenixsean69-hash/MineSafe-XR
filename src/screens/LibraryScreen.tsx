import Icon from '../components/Icon'
import type { ScenarioKind } from '../types'
import { SCENARIOS } from '../types'
import type { DrillSession } from '../session'
import { formatDuration } from '../session'

type Props = {
  activeScenario: ScenarioKind
  onLoad: (scenario: ScenarioKind) => void
  onOpenSetup: (scenario: ScenarioKind) => void
  recent: DrillSession[]
  onOpenSession: (session: DrillSession) => void
}

export default function LibraryScreen(props: Props) {
  const entries = Object.values(SCENARIOS)

  return (
    <section className="library-screen">
      <header className="library-header">
        <div>
          <span className="section-kicker">SCENARIO LIBRARY</span>
          <h2>Training scenarios</h2>
          <p>Choose a training scenario, configure the participants and run an instructor-led drill.</p>
        </div>
        <div className="library-meta">
          <Icon name="inventory_2" />
          <span>{entries.length} available</span>
        </div>
      </header>

      <div className="scenario-library-grid">
        {entries.map((entry) => (
          <article className={`library-card ${props.activeScenario === entry.id ? 'active' : ''}`} key={entry.id}>
            <div className="library-card-icon">
              <Icon name={entry.id === 'fire' ? 'local_fire_department' : entry.id === 'rockfall' ? 'landslide' : 'air'} filled />
            </div>
            <div className="library-card-main">
              <div className="library-card-title">
                <span>{entry.code}</span>
                <strong>{entry.title}</strong>
              </div>
              <p>{entry.objective}</p>
              <div className="library-tags">
                <span>{entry.subtitle}</span>
                <span>{entry.sourceNote}</span>
              </div>
            </div>
            <div className="library-card-actions">
              <button onClick={() => props.onOpenSetup(entry.id)}><Icon name="tune" /> Configure</button>
              <button className="primary" onClick={() => props.onLoad(entry.id)}><Icon name="play_arrow" filled /> Open drill</button>
            </div>
          </article>
        ))}
      </div>

      <section className="pipeline-panel">
        <div className="editor-header">
          <span>Planned incident-to-training workflow</span>
          <Icon name="account_tree" />
        </div>
        <div className="pipeline-steps">
          {[
            ['1', 'Record', 'Capture an incident, near-miss or mine condition.'],
            ['2', 'Reconstruct', 'Recreate the location, route and hazard state.'],
            ['3', 'Build drill', 'Convert the reconstruction into a controlled scenario.'],
            ['4', 'Train', 'Run the exercise and record trainee decisions.'],
            ['5', 'Debrief', 'Replay the response and identify learning points.'],
          ].map(([number, title, copy]) => (
            <div className="pipeline-step" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="saved-sessions">
        <div className="editor-header"><span>Recent sessions on this device</span><span>Up to 12 records</span></div>
        {props.recent.length ? props.recent.map(session => <button className="saved-session" key={session.id}
          onClick={() => props.onOpenSession(session)}>
          <Icon name="fact_check" />
          <span><strong>{session.config.trainee}</strong><small>{SCENARIOS[session.scenario].title + ' · ' + session.config.area}</small></span>
          <span>{formatDuration(session.elapsedMs)}</span><span>{session.status === 'complete' ? 'Ended' : 'Paused'}</span>
          <Icon name="chevron_right" />
        </button>) : <p className="empty-state">Previous drills appear here when you prepare another drill. Export sessions you need to retain.</p>}
      </section>
    </section>
  )
}
