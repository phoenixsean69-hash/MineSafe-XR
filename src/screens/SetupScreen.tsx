import { useState } from 'react'
import Icon from '../components/Icon'
import MineScene from '../components/MineScene'
import { SystemSwitch } from '../components/Controls'
import type { DrillPhase, ScenarioKind, ViewStyle } from '../types'
import type { DrillConfig } from '../session'
import { SCENARIOS } from '../types'

type Props = {
  scenario: ScenarioKind
  phase: DrillPhase
  viewStyle: ViewStyle
  showRoutes: boolean
  showLabels: boolean
  showGrid: boolean
  autoAdvance: boolean
  config: DrillConfig
  locked: boolean
  onConfig: (config: DrillConfig) => void
  onScenario: (scenario: ScenarioKind) => void
  onPhase: (phase: DrillPhase) => void
  onViewStyle: (style: ViewStyle) => void
  onShowRoutes: (checked: boolean) => void
  onShowLabels: (checked: boolean) => void
  onShowGrid: (checked: boolean) => void
  onAutoAdvance: (checked: boolean) => void
  onStartDrill: () => void
  onNewDrill: () => void
  onNotice: (message: string) => void
}

export default function SetupScreen(props: Props) {
  const [selectedNode, setSelectedNode] = useState('hazard')
  const definition = SCENARIOS[props.scenario]
  return (
    <section className="setup-screen">
      <aside className="setup-tree">
        <div className="editor-header"><span>Scenario setup</span><Icon name="tune" /></div>
        <div className="setup-title">
          <span className="setup-code">{definition.code}</span>
          <strong>{definition.title}</strong>
          <small>{props.config.area}</small>
        </div>
        <div className="tree-list">
          {[
            ['environment', 'location_on', 'Environment'], ['hazard', 'warning', 'Hazard source'],
            ['people', 'group', 'Participants'], ['assessment', 'fact_check', 'Exercise controls'],
          ].map(([id, icon, label]) => <button key={id}
            className={'tree-row ' + (selectedNode === id ? 'selected' : '')}
            onClick={() => {
              setSelectedNode(id)
              document.getElementById('setup-' + id)?.focus()
            }}><Icon name={icon} /> {label}</button>)}
        </div>
        <div className="panel-section brief-section">
          <div className="section-title">Objective</div><p>{definition.objective}</p>
        </div>
        <div className="panel-section brief-section">
          <div className="section-title">Before you start</div>
          <p>Preview the hazard and routes, check the participant details, then start the drill. Preview controls do not record observations.</p>
        </div>
      </aside>

      <section className="setup-viewport">
        <div className="editor-header"><span>Scenario preview</span>
          <div className="viewport-actions">
            {(['wireframe', 'solid', 'rendered'] as ViewStyle[]).map(style =>
              <button key={style} className={props.viewStyle === style ? 'active-icon' : ''}
                onClick={() => props.onViewStyle(style)} title={style}>
                <Icon name={style === 'wireframe' ? 'grid_on' : style === 'solid' ? 'circle' : 'view_in_ar'} /></button>)}
          </div>
        </div>
        <div className={'viewport-stage ' + (props.showGrid ? '' : 'grid-hidden')}>
          <MineScene phase={props.phase} scenario={props.scenario} viewStyle={props.viewStyle}
            showRoutes={props.showRoutes} showLabels={props.showLabels} />
          <div className="viewport-overlay top-left"><strong>{props.config.area}</strong><span>Preview · Shared training layout</span></div>
        </div>
      </section>

      <aside className="setup-properties">
        <div className="editor-header"><span>Scenario properties</span><Icon name="tune" /></div>
        <div className="setup-form">
          {props.locked && <div className="setup-note">
            <p>Details are locked for this session. Prepare a new drill to change them.</p>
            <button className="secondary-action" onClick={props.onNewDrill}>Prepare new drill</button>
          </div>}
          <label><span>Emergency type</span>
            <select id="setup-hazard" value={props.scenario} disabled={props.locked}
              onChange={event => props.onScenario(event.target.value as ScenarioKind)}>
              <option value="fire">Underground fire</option><option value="rockfall">Fall of ground</option>
              <option value="ventilation">Ventilation loss</option>
            </select>
          </label>
          <label><span>Mine area label</span>
            <input id="setup-environment" value={props.config.area} maxLength={100} disabled={props.locked}
              onChange={event => props.onConfig({ ...props.config, area: event.target.value })} />
          </label>
          <p className="field-help">The area name labels the session. All three scenarios use the shared training layout.</p>
          <label><span>Trainee or team name</span>
            <input id="setup-people" value={props.config.trainee} maxLength={60} disabled={props.locked}
              onChange={event => props.onConfig({ ...props.config, trainee: event.target.value })} />
          </label>
          <label><span>Number of participants</span>
            <input type="number" min={1} max={50} value={props.config.personnel} disabled={props.locked}
              onChange={event => props.onConfig({ ...props.config, personnel: Math.max(1, Math.min(50, Number(event.target.value) || 1)) })} />
          </label>
          <div className="setup-divider" />
          <div className="section-title">Preview state</div>
          <div className="phase-button-grid">
            {([['idle', 'Baseline'], ['alarm', 'Hazard'], ['blocked', 'Route loss'], ['reroute', 'Reroute']] as [DrillPhase, string][]).map(([value, label]) =>
              <button key={value} className={props.phase === value ? 'active' : ''} onClick={() => props.onPhase(value)}>{label}</button>)}
          </div>
          <div className="setup-divider" />
          <div className="section-title" id="setup-assessment" tabIndex={-1}>Exercise controls</div>
          <div className="switch-list">
            <SystemSwitch label="Automatic event playback" checked={props.autoAdvance} onChange={props.onAutoAdvance} />
            <SystemSwitch label="Route guidance" checked={props.showRoutes} onChange={props.onShowRoutes} />
            <SystemSwitch label="Scene labels" checked={props.showLabels} onChange={props.onShowLabels} />
            <SystemSwitch label="Viewport grid" checked={props.showGrid} onChange={props.onShowGrid} />
          </div>
          <p className="field-help">Manual mode lets the instructor introduce each event. Automatic playback advances every three seconds; observations remain manual.</p>
          <button className="setup-primary" onClick={props.onStartDrill}
            disabled={!props.config.trainee.trim() || !props.config.area.trim()}>
            <Icon name="play_arrow" filled /> {props.locked ? 'Return to current drill' : 'Start drill'}
          </button>
        </div>
      </aside>
    </section>
  )
}
