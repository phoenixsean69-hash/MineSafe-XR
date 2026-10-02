import { useState } from 'react'
import Icon from '../components/Icon'
import MineScene from '../components/MineScene'
import { SystemSwitch } from '../components/Controls'
import type { DrillPhase, ScenarioKind, ViewStyle } from '../types'
import { SCENARIOS } from '../types'

type Props = {
  scenario: ScenarioKind
  phase: DrillPhase
  viewStyle: ViewStyle
  showRoutes: boolean
  showLabels: boolean
  showGrid: boolean
  autoAdvance: boolean
  onScenario: (scenario: ScenarioKind) => void
  onPhase: (phase: DrillPhase) => void
  onViewStyle: (style: ViewStyle) => void
  onShowRoutes: (checked: boolean) => void
  onShowLabels: (checked: boolean) => void
  onShowGrid: (checked: boolean) => void
  onAutoAdvance: (checked: boolean) => void
  onStartDrill: () => void
  onNotice: (message: string) => void
}

export default function SetupScreen(props: Props) {
  const [selectedNode, setSelectedNode] = useState('hazard')
  const definition = SCENARIOS[props.scenario]

  return (
    <section className="setup-screen">
      <aside className="setup-tree">
        <div className="editor-header">
          <span>Scenario setup</span>
          <button onClick={() => props.onNotice('Scenario setup')}><Icon name="more_vert" /></button>
        </div>

        <div className="setup-title">
          <span className="setup-code">{definition.code}</span>
          <strong>{definition.title}</strong>
          <small>{definition.subtitle}</small>
        </div>

        <div className="tree-list">
          {[
            ['environment', 'location_on', 'Environment'],
            ['hazard', 'warning', 'Hazard source'],
            ['routes', 'route', 'Escape routes'],
            ['people', 'group', 'Participants'],
            ['assessment', 'fact_check', 'Assessment'],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={`tree-row ${selectedNode === id ? 'selected' : ''}`}
              onClick={() => setSelectedNode(id)}
            >
              <Icon name={icon} /> {label}
            </button>
          ))}
        </div>

        <div className="panel-section brief-section">
          <div className="section-title">Objective</div>
          <p>{definition.objective}</p>
        </div>
      </aside>

      <section className="setup-viewport">
        <div className="editor-header">
          <span>Scenario preview</span>
          <div className="viewport-actions">
            <button className={props.viewStyle === 'wireframe' ? 'active-icon' : ''} onClick={() => props.onViewStyle('wireframe')} title="Wireframe"><Icon name="grid_on" /></button>
            <button className={props.viewStyle === 'solid' ? 'active-icon' : ''} onClick={() => props.onViewStyle('solid')} title="Solid"><Icon name="circle" filled /></button>
            <button className={props.viewStyle === 'rendered' ? 'active-icon' : ''} onClick={() => props.onViewStyle('rendered')} title="Rendered"><Icon name="view_in_ar" /></button>
          </div>
        </div>

        <div className={`viewport-stage ${props.showGrid ? '' : 'grid-hidden'}`}>
          <MineScene
            phase={props.phase}
            scenario={props.scenario}
            viewStyle={props.viewStyle}
            showRoutes={props.showRoutes}
            showLabels={props.showLabels}
          />
          <div className="viewport-overlay top-left">
            <strong>{definition.subtitle}</strong>
            <span>Scenario builder preview</span>
          </div>
        </div>
      </section>

      <aside className="setup-properties">
        <div className="editor-header">
          <span>Scenario properties</span>
          <Icon name="tune" />
        </div>

        <div className="setup-form">
          <label>
            <span>Emergency type</span>
            <select value={props.scenario} onChange={(event) => { props.onScenario(event.target.value as ScenarioKind); props.onPhase('idle') }}>
              <option value="fire">Underground fire</option>
              <option value="rockfall">Fall of ground</option>
              <option value="ventilation">Ventilation loss</option>
            </select>
          </label>

          <label>
            <span>Mine area</span>
            <select defaultValue="north">
              <option value="north">North Decline / Level 4</option>
              <option value="east">East Access / Level 3</option>
              <option value="vent">Ventilation District B</option>
            </select>
          </label>

          <label>
            <span>Trainee</span>
            <select defaultValue="worker017">
              <option value="worker017">Worker 017</option>
              <option value="team">Six-person response team</option>
            </select>
          </label>

          <div className="setup-divider" />

          <div className="section-title">Preview state</div>
          <div className="phase-button-grid">
            <button className={props.phase === 'idle' ? 'active' : ''} onClick={() => props.onPhase('idle')}>Baseline</button>
            <button className={props.phase === 'alarm' ? 'active' : ''} onClick={() => props.onPhase('alarm')}>Hazard</button>
            <button className={props.phase === 'blocked' ? 'active' : ''} onClick={() => props.onPhase('blocked')}>Route loss</button>
            <button className={props.phase === 'reroute' ? 'active' : ''} onClick={() => props.onPhase('reroute')}>Reroute</button>
          </div>

          <div className="setup-divider" />

          <div className="switch-list">
            <SystemSwitch label="Auto-advance events" checked={props.autoAdvance} onChange={props.onAutoAdvance} />
            <SystemSwitch label="Route guidance" checked={props.showRoutes} onChange={props.onShowRoutes} />
            <SystemSwitch label="Scene labels" checked={props.showLabels} onChange={props.onShowLabels} />
            <SystemSwitch label="Viewport grid" checked={props.showGrid} onChange={props.onShowGrid} />
          </div>

          <button className="setup-primary" onClick={props.onStartDrill}>
            <Icon name="play_arrow" filled /> Load and start drill
          </button>
        </div>
      </aside>
    </section>
  )
}