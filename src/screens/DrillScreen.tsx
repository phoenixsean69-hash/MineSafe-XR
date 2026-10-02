import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import MineScene from '../components/MineScene'
import { PanelSection, RadioAction, SystemSwitch } from '../components/Controls'
import type { DrillPhase, ScenarioKind, ViewStyle } from '../types'
import { PHASES, PHASE_TIME, SCENARIOS } from '../types'

type Assessment = {
  hazard: boolean
  route: boolean
  alternate: boolean
}

type Props = {
  scenario: ScenarioKind
  phase: DrillPhase
  autoRun: boolean
  autoAdvance: boolean
  showRoutes: boolean
  showLabels: boolean
  showWarnings: boolean
  showGrid: boolean
  viewStyle: ViewStyle
  assessment: Assessment
  onAssessment: (next: Assessment) => void
  onAutoAdvance: (checked: boolean) => void
  onShowRoutes: (checked: boolean) => void
  onShowLabels: (checked: boolean) => void
  onShowWarnings: (checked: boolean) => void
  onShowGrid: (checked: boolean) => void
  onViewStyle: (style: ViewStyle) => void
  onStartPause: () => void
  onAdvance: () => void
  onReset: () => void
  onNotice: (message: string) => void
}

type PropertyTab = 'safety' | 'environment' | 'routes' | 'assessment'

export default function DrillScreen(props: Props) {
  const [activeTool, setActiveTool] = useState('select')
  const [selectedEntity, setSelectedEntity] = useState('worker')
  const [activeProperty, setActiveProperty] = useState<PropertyTab>('safety')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    conditions: true,
    actions: true,
    cue: true,
    aids: true,
    environment: true,
    routes: true,
    assessment: true,
  })
  const [cameraKey, setCameraKey] = useState(0)

  const definition = SCENARIOS[props.scenario]
  const phaseIndex = PHASES.indexOf(props.phase)
  const elapsed = PHASE_TIME[props.phase]

  const risk = props.phase === 'idle' ? 'Low' : props.phase === 'alarm' ? 'High' : props.phase === 'blocked' ? 'Critical' : 'Controlled'

  const instructorCue = useMemo(() => {
    if (props.phase === 'idle') return 'Confirm the trainee is ready, then start the exercise.'
    if (props.phase === 'alarm') return 'Watch for hazard recognition before introducing the next inject.'
    if (props.phase === 'blocked') return 'Do not coach the route choice. Observe the trainee response.'
    if (props.phase === 'reroute') return 'Allow the trainee to continue to the refuge point.'
    return 'Review the route decision and response timing with the trainee.'
  }, [props.phase])

  const toggle = (name: string) => {
    setOpenSections((value) => ({ ...value, [name]: !value[name] }))
  }

  const propertyTabs: Array<[PropertyTab, string, string]> = [
    ['safety', 'health_and_safety', 'Safety'],
    ['environment', 'air', 'Environment'],
    ['routes', 'route', 'Routes'],
    ['assessment', 'fact_check', 'Assessment'],
  ]

  return (
    <section className="screen-editor-grid">
      <aside className="tool-rail" aria-label="Viewport tools">
        {[
          ['select', 'near_me', 'Select'],
          ['move', 'open_with', 'Move'],
          ['rotate', 'rotate_right', 'Rotate'],
          ['pan', 'pan_tool', 'Pan'],
          ['zoom', 'zoom_in', 'Zoom'],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            className={activeTool === id ? 'active' : ''}
            title={label}
            onClick={() => {
              setActiveTool(id)
              props.onNotice(`${label} tool active`)
            }}
          >
            <Icon name={icon} />
          </button>
        ))}
        <span className="tool-separator" />
        <button
          title="Frame scene"
          onClick={() => {
            setCameraKey((value) => value + 1)
            props.onNotice('Scene framed')
          }}
        >
          <Icon name="filter_center_focus" />
        </button>
      </aside>

      <aside className="outliner-panel">
        <div className="editor-header">
          <span>Scenario</span>
          <div className="editor-actions">
            <button title="Find trainee" onClick={() => setSelectedEntity('worker')}><Icon name="search" /></button>
            <button title="Scenario details" onClick={() => props.onNotice(definition.code)}><Icon name="more_vert" /></button>
          </div>
        </div>

        <div className="scenario-name">
          <div className="scenario-glyph danger"><Icon name={props.scenario === 'fire' ? 'local_fire_department' : props.scenario === 'rockfall' ? 'landslide' : 'air'} filled /></div>
          <div>
            <strong>{definition.title}</strong>
            <span>{definition.subtitle}</span>
          </div>
        </div>

        <div className="tree-list">
          <button className="tree-row root" onClick={() => setSelectedEntity('scene')}><Icon name="expand_more" /><Icon name="folder_open" /> Training scene</button>
          <button className={`tree-row child ${selectedEntity === 'worker' ? 'selected' : ''}`} onClick={() => setSelectedEntity('worker')}><Icon name="person" /> Worker 017</button>
          <button className={`tree-row child ${selectedEntity === 'asset' ? 'selected' : ''}`} onClick={() => setSelectedEntity('asset')}><Icon name="precision_manufacturing" /> {definition.sceneAsset}</button>
          <button className={`tree-row child ${selectedEntity === 'route' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('route'); setActiveProperty('routes') }}><Icon name="route" /> Route A</button>
          <button className={`tree-row child ${selectedEntity === 'refuge' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('refuge'); setActiveProperty('routes') }}><Icon name="meeting_room" /> Refuge Chamber 2</button>
          <button className={`tree-row child ${selectedEntity === 'ventilation' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('ventilation'); setActiveProperty('environment') }}><Icon name="air" /> Ventilation district</button>
        </div>

        <div className="panel-section compact-facts">
          <div className="section-title">Exercise</div>
          <dl>
            <div><dt>Trainee</dt><dd>Worker 017</dd></div>
            <div><dt>Personnel</dt><dd>6</dd></div>
            <div><dt>Elapsed</dt><dd>00:{String(elapsed).padStart(2, '0')}</dd></div>
          </dl>
        </div>

        <div className="panel-section brief-section">
          <div className="section-title">Training brief</div>
          <p>{definition.objective}</p>
        </div>
      </aside>

      <section className="viewport-editor">
        <div className="viewport-header editor-header">
          <div className="viewport-mode">
            <button
              className={activeTool === 'select' ? 'active' : ''}
              onClick={() => setActiveTool('select')}
            >
              <Icon name="deployed_code" /> Object mode
            </button>
            <span className="divider" />
            <button
              title="Toggle labels"
              className={props.showLabels ? 'active-icon' : ''}
              onClick={() => props.onShowLabels(!props.showLabels)}
            >
              <Icon name="layers" />
            </button>
            <button
              title="Toggle routes"
              className={props.showRoutes ? 'active-icon' : ''}
              onClick={() => props.onShowRoutes(!props.showRoutes)}
            >
              <Icon name="timeline" />
            </button>
          </div>

          <div className="viewport-actions">
            <button
              title="Toggle grid"
              className={props.showGrid ? 'active-icon' : ''}
              onClick={() => props.onShowGrid(!props.showGrid)}
            >
              <Icon name="grid_4x4" />
            </button>
            <button title="Wireframe" className={props.viewStyle === 'wireframe' ? 'active-icon' : ''} onClick={() => props.onViewStyle('wireframe')}><Icon name="grid_on" /></button>
            <button title="Solid" className={props.viewStyle === 'solid' ? 'active-icon' : ''} onClick={() => props.onViewStyle('solid')}><Icon name="circle" filled /></button>
            <button title="Rendered" className={props.viewStyle === 'rendered' ? 'active-icon' : ''} onClick={() => props.onViewStyle('rendered')}><Icon name="view_in_ar" /></button>
          </div>
        </div>

        <div className={`viewport-stage ${props.showGrid ? '' : 'grid-hidden'}`}>
          <MineScene
            key={cameraKey}
            phase={props.phase}
            scenario={props.scenario}
            viewStyle={props.viewStyle}
            showRoutes={props.showRoutes}
            showLabels={props.showLabels}
          />

          <div className="axis-gizmo">
            <span className="axis-z">Z</span>
            <span className="axis-y">Y</span>
            <span className="axis-x">X</span>
          </div>

          {props.showLabels && (
            <div className="viewport-overlay top-left">
              <strong>{definition.subtitle}</strong>
              <span>Training environment - simulated data</span>
            </div>
          )}

          {props.showWarnings && props.phase !== 'idle' && props.phase !== 'complete' && (
            <div className="simulation-banner">
              <Icon name="warning" filled />
              <div>
                <strong>Simulation active</strong>
                <span>Displayed hazards are training data.</span>
              </div>
            </div>
          )}

          <div className="viewport-hint">
            <span><Icon name="mouse" /> Orbit</span>
            <span><Icon name="pan_tool" /> Pan</span>
            <span><Icon name="zoom_in" /> Zoom</span>
          </div>
        </div>
      </section>

      <aside className="properties-editor">
        <div className="properties-tabs">
          {propertyTabs.map(([id, icon, label]) => (
            <button
              key={id}
              className={activeProperty === id ? 'active' : ''}
              title={label}
              onClick={() => setActiveProperty(id)}
            >
              <Icon name={icon} filled={activeProperty === id} />
            </button>
          ))}
        </div>

        <div className="properties-content">
          <div className="editor-header properties-titlebar">
            <span>{propertyTabs.find(([id]) => id === activeProperty)?.[2]}</span>
            <button title="Panel options" onClick={() => props.onNotice('Property panel')}><Icon name="more_horiz" /></button>
          </div>

          {activeProperty === 'safety' && (
            <>
              <div className={`risk-readout risk-${risk.toLowerCase()}`}>
                <div>
                  <span>Current training risk</span>
                  <strong>{risk}</strong>
                </div>
                <Icon name={risk === 'Low' || risk === 'Controlled' ? 'verified_user' : 'warning'} filled />
              </div>

              <PanelSection title="Mine conditions" open={openSections.conditions} onToggle={() => toggle('conditions')}>
                <div className="condition-row">
                  <span>Airflow</span>
                  <div className="condition-value"><strong>{props.phase === 'idle' ? '2.8' : props.scenario === 'ventilation' ? '0.9' : '1.7'}</strong><small>m/s</small></div>
                </div>
                <div className="meter"><i style={{ width: props.phase === 'idle' ? '76%' : props.scenario === 'ventilation' ? '28%' : '46%' }} /></div>

                <div className="condition-row">
                  <span>Visibility</span>
                  <div className="condition-value"><strong>{props.phase === 'idle' ? '92' : props.scenario === 'fire' ? (props.phase === 'alarm' ? '68' : '41') : '78'}</strong><small>%</small></div>
                </div>
                <div className="meter"><i style={{ width: props.phase === 'idle' ? '92%' : props.scenario === 'fire' ? (props.phase === 'alarm' ? '68%' : '41%') : '78%' }} /></div>

                <div className="property-line"><span>Primary escapeway</span><strong className={phaseIndex >= 2 ? 'value-danger' : 'value-safe'}>{phaseIndex >= 2 ? 'BLOCKED' : 'OPEN'}</strong></div>
                <div className="property-line"><span>Alternate refuge</span><strong>164 m</strong></div>
              </PanelSection>

              <PanelSection title="Trainee actions" open={openSections.actions} onToggle={() => toggle('actions')}>
                <div className="action-list">
                  <RadioAction
                    label="Hazard recognised"
                    checked={phaseIndex >= 1 || props.assessment.hazard}
                    onSelect={() => props.onAssessment({ ...props.assessment, hazard: true })}
                  />
                  <RadioAction
                    label="Unsafe route rejected"
                    checked={phaseIndex >= 3 || props.assessment.route}
                    onSelect={() => props.onAssessment({ ...props.assessment, route: true })}
                  />
                  <RadioAction
                    label="Alternate route selected"
                    checked={phaseIndex >= 3 || props.assessment.alternate}
                    onSelect={() => props.onAssessment({ ...props.assessment, alternate: true })}
                  />
                </div>
              </PanelSection>

              <PanelSection title="Instructor cue" open={openSections.cue} onToggle={() => toggle('cue')}>
                <p className="panel-copy">{instructorCue}</p>
              </PanelSection>

              <PanelSection title="System aids" open={openSections.aids} onToggle={() => toggle('aids')}>
                <div className="switch-list">
                  <SystemSwitch label="Auto-advance events" checked={props.autoAdvance} onChange={props.onAutoAdvance} />
                  <SystemSwitch label="Route guidance" checked={props.showRoutes} onChange={props.onShowRoutes} />
                  <SystemSwitch label="Scene labels" checked={props.showLabels} onChange={props.onShowLabels} />
                  <SystemSwitch label="Hazard banner" checked={props.showWarnings} onChange={props.onShowWarnings} />
                  <SystemSwitch label="Viewport grid" checked={props.showGrid} onChange={props.onShowGrid} />
                </div>
              </PanelSection>
            </>
          )}

          {activeProperty === 'environment' && (
            <>
              <div className="risk-readout">
                <div><span>Environment source</span><strong>Simulated</strong></div>
                <Icon name="air" filled />
              </div>
              <PanelSection title="Environment" open={openSections.environment} onToggle={() => toggle('environment')}>
                <div className="property-line"><span>District</span><strong>{definition.subtitle}</strong></div>
                <div className="property-line"><span>Ventilation</span><strong>{props.scenario === 'ventilation' && phaseIndex >= 1 ? 'REDUCED' : 'NORMAL'}</strong></div>
                <div className="property-line"><span>Lighting</span><strong>TRAINING</strong></div>
                <div className="property-line"><span>Data type</span><strong>SIMULATED</strong></div>
              </PanelSection>
            </>
          )}

          {activeProperty === 'routes' && (
            <>
              <div className={`risk-readout risk-${phaseIndex >= 2 ? 'critical' : 'low'}`}>
                <div><span>Primary escapeway</span><strong>{phaseIndex >= 2 ? 'Blocked' : 'Open'}</strong></div>
                <Icon name={phaseIndex >= 2 ? 'block' : 'route'} filled />
              </div>
              <PanelSection title="Route status" open={openSections.routes} onToggle={() => toggle('routes')}>
                <div className="property-line"><span>Route A</span><strong className={phaseIndex >= 2 ? 'value-danger' : 'value-safe'}>{phaseIndex >= 2 ? 'BLOCKED' : 'OPEN'}</strong></div>
                <div className="property-line"><span>Refuge Chamber 2</span><strong>164 m</strong></div>
                <div className="property-line"><span>Route overlay</span><strong>{props.showRoutes ? 'VISIBLE' : 'HIDDEN'}</strong></div>
              </PanelSection>
            </>
          )}

          {activeProperty === 'assessment' && (
            <>
              <div className="risk-readout">
                <div><span>Exercise progress</span><strong>{props.phase === 'complete' ? 'Complete' : `${phaseIndex}/4 events`}</strong></div>
                <Icon name="fact_check" filled />
              </div>
              <PanelSection title="Assessment" open={openSections.assessment} onToggle={() => toggle('assessment')}>
                <div className="action-list">
                  <RadioAction label="Hazard recognised" checked={phaseIndex >= 1 || props.assessment.hazard} onSelect={() => props.onAssessment({ ...props.assessment, hazard: true })} />
                  <RadioAction label="Unsafe route rejected" checked={phaseIndex >= 3 || props.assessment.route} onSelect={() => props.onAssessment({ ...props.assessment, route: true })} />
                  <RadioAction label="Alternate route selected" checked={phaseIndex >= 3 || props.assessment.alternate} onSelect={() => props.onAssessment({ ...props.assessment, alternate: true })} />
                </div>
              </PanelSection>
            </>
          )}

          <div className="exercise-controls">
            <button className="primary-action" onClick={props.onStartPause}>
              <Icon name={props.autoRun ? 'pause' : 'play_arrow'} filled />
              {props.phase === 'idle' ? 'Start drill' : props.phase === 'complete' ? 'Run again' : props.autoRun ? 'Pause drill' : 'Resume drill'}
            </button>
            <button className="secondary-action" onClick={props.onAdvance} disabled={props.phase === 'complete'}>
              <Icon name="add_alert" /> Next inject
            </button>
            <button className="icon-action" onClick={props.onReset} title="Restart exercise">
              <Icon name="restart_alt" />
            </button>
          </div>
        </div>
      </aside>
    </section>
  )
}