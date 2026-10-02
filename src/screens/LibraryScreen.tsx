import Icon from '../components/Icon'
import type { ScenarioKind } from '../types'
import { SCENARIOS } from '../types'

type Props = {
  activeScenario: ScenarioKind
  onLoad: (scenario: ScenarioKind) => void
  onOpenSetup: (scenario: ScenarioKind) => void
}

export default function LibraryScreen(props: Props) {
  const entries = Object.values(SCENARIOS)

  return (
    <section className="library-screen">
      <header className="library-header">
        <div>
          <span className="section-kicker">SCENARIO LIBRARY</span>
          <h2>Training scenarios</h2>
          <p>Prototype scenarios for mine emergency drills and incident-to-training workflows.</p>
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
          <span>Incident-to-training workflow</span>
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
    </section>
  )
}