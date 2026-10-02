import { useEffect, useMemo, useState } from 'react'
import MineScene, { type DrillPhase, type ViewStyle } from './components/MineScene'

type EventItem = {
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'danger' | 'safe'
}

type PropertyTab = 'exercise' | 'safety' | 'environment' | 'routes' | 'assessment'
type Workspace = 'Drill' | 'Setup' | 'Debrief'

const PHASES: DrillPhase[] = ['idle', 'alarm', 'blocked', 'reroute', 'complete']

const PHASE_TIME: Record<DrillPhase, number> = {
  idle: 0,
  alarm: 8,
  blocked: 16,
  reroute: 24,
  complete: 36,
}

const EVENTS: Record<DrillPhase, EventItem> = {
  idle: {
    time: '00:00',
    title: 'Area ready',
    detail: 'North Decline loaded with baseline training conditions.',
    tone: 'neutral',
  },
  alarm: {
    time: '00:08',
    title: 'Fire inject started',
    detail: 'Simulated heat source introduced at the loader bay.',
    tone: 'danger',
  },
  blocked: {
    time: '00:16',
    title: 'Route A withdrawn',
    detail: 'Smoke spread makes the primary escapeway unsafe.',
    tone: 'danger',
  },
  reroute: {
    time: '00:24',
    title: 'Alternate route selected',
    detail: 'Worker 017 turns toward Refuge Chamber 2.',
    tone: 'safe',
  },
  complete: {
    time: '00:36',
    title: 'Exercise ended',
    detail: 'Actions and timing are available for debrief.',
    tone: 'safe',
  },
}

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-rounded app-icon"
      aria-hidden="true"
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 420, 'GRAD' 0, 'opsz' 20` }}
    >
      {name}
    </span>
  )
}

function RadioAction({
  label,
  checked,
  onSelect,
}: {
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className={`radio-action ${checked ? 'is-checked' : ''}`}>
      <input type="radio" checked={checked} onChange={onSelect} />
      <span>{label}</span>
    </label>
  )
}

function SystemSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="system-switch">
      <span>{label}</span>
      <span className="switch-control">
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <i />
      </span>
    </label>
  )
}
function App() {
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [autoRun, setAutoRun] = useState(false)
  const [activeTool, setActiveTool] = useState('select')
  const [workspace, setWorkspace] = useState<Workspace>('Drill')
  const [activeProperty, setActiveProperty] = useState<PropertyTab>('safety')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState('worker')
  const [viewStyle, setViewStyle] = useState<ViewStyle>('solid')
  const [showGrid, setShowGrid] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cameraKey, setCameraKey] = useState(0)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    conditions: true,
    actions: true,
    cue: true,
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [manualAssessment, setManualAssessment] = useState({
    hazard: false,
    route: false,
    alternate: false,
  })
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [showWarnings, setShowWarnings] = useState(true)

  const phaseIndex = PHASES.indexOf(phase)
  const elapsed = PHASE_TIME[phase]
  const visibleEvents = useMemo(
    () => PHASES.slice(0, phaseIndex + 1).map((item) => EVENTS[item]),
    [phaseIndex],
  )

  useEffect(() => {
    if (!autoRun || !autoAdvance || phase === 'complete') return

    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(PHASES.indexOf(phase) + 1, PHASES.length - 1)
      setPhase(PHASES[nextIndex])
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [autoRun, autoAdvance, phase])

  useEffect(() => {
    if (phase === 'complete') {
      setAutoRun(false)
      setWorkspace('Debrief')
      setActiveProperty('assessment')
    }
  }, [phase])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 1800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const goToPhase = (target: DrillPhase) => {
    setAutoRun(false)
    setPhase(target)
  }

  const reset = () => {
    setPhase('idle')
    setAutoRun(false)
    setWorkspace('Drill')
    setActiveProperty('safety')
    setManualAssessment({
      hazard: false,
      route: false,
      alternate: false,
    })
    setNotice('Exercise reset')
  }

  const toggleRun = () => {
    if (phase === 'complete') {
      setPhase('alarm')
      setWorkspace('Drill')
      setActiveProperty('safety')
      setAutoRun(autoAdvance)
      return
    }

    if (phase === 'idle') {
      setPhase('alarm')
      setAutoRun(autoAdvance)
      if (!autoAdvance) setNotice('Manual event mode - use Next inject')
      return
    }

    if (!autoAdvance) {
      setAutoRun(false)
      setNotice('Auto-advance is off - use Next inject')
      return
    }

    setAutoRun((value) => !value)
  }

  const advance = () => {
    if (phase === 'complete') return
    setAutoRun(false)
    setPhase(PHASES[Math.min(phaseIndex + 1, PHASES.length - 1)])
  }

  const previous = () => {
    setAutoRun(false)
    setPhase(PHASES[Math.max(phaseIndex - 1, 0)])
  }

  const jumpEnd = () => {
    setAutoRun(false)
    setPhase('complete')
  }

  const selectWorkspace = (name: Workspace) => {
    setWorkspace(name)
    setActiveMenu(null)

    if (name === 'Setup') setActiveProperty('exercise')
    if (name === 'Drill') setActiveProperty('safety')
    if (name === 'Debrief') setActiveProperty('assessment')
  }

  const toggleSection = (name: string) => {
    setOpenSections((value) => ({ ...value, [name]: !value[name] }))
  }

  const exportSession = () => {
    const data = {
      product: 'MineSafe XR',
      scenario: 'MXR-01',
      phase,
      elapsed,
      trainee: 'Worker 017',
      personnel: 6,
      routeA: phaseIndex >= 2 ? 'Blocked' : 'Open',
      alternateRefuge: '164 m',
      events: visibleEvents,
      prototype: true,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'minesafe-xr-session.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice('Session exported')
  }

  const status = phase === 'idle' ? 'Ready' : phase === 'complete' ? 'Debrief ready' : 'Drill active'
  const risk = phase === 'idle' ? 'Low' : phase === 'alarm' ? 'High' : phase === 'blocked' ? 'Critical' : 'Controlled'

  const instructorCue =
    phase === 'idle'
      ? 'Confirm the trainee is ready, then start the exercise.'
      : phase === 'alarm'
        ? 'Watch for hazard recognition before introducing route loss.'
        : phase === 'blocked'
          ? 'Do not coach the route choice. Observe the trainee response.'
          : phase === 'reroute'
            ? 'Allow the trainee to continue to the refuge point.'
            : 'Review the route decision and response timing with the trainee.'

  const menuAction = (action: string) => {
    setActiveMenu(null)

    if (action === 'reset') reset()
    if (action === 'export') exportSession()
    if (action === 'alarm') goToPhase('alarm')
    if (action === 'blocked') goToPhase('blocked')
    if (action === 'reroute') goToPhase('reroute')
    if (action === 'complete') jumpEnd()
    if (action === 'grid') setShowGrid((value) => !value)
    if (action === 'labels') setShowLabels((value) => !value)
    if (action === 'routes') setShowRoutes((value) => !value)
    if (action === 'play') toggleRun()
    if (action === 'previous') previous()
    if (action === 'next') advance()
    if (action === 'shortcuts') setHelpOpen(true)
    if (action === 'about') {
      setHelpOpen(true)
      setNotice('MineSafe XR desktop prototype')
    }
  }

  const renderMenu = () => {
    if (!activeMenu) return null

    const items: Record<string, Array<[string, string]>> = {
      File: [
        ['Reset exercise', 'reset'],
        ['Export session', 'export'],
      ],
      Edit: [
        ['Select trainee', 'select-worker'],
        ['Reset exercise', 'reset'],
      ],
      Scenario: [
        ['Trigger fire inject', 'alarm'],
        ['Withdraw Route A', 'blocked'],
        ['Select alternate route', 'reroute'],
        ['End exercise', 'complete'],
      ],
      View: [
        [`${showGrid ? 'Hide' : 'Show'} viewport grid`, 'grid'],
        [`${showLabels ? 'Hide' : 'Show'} labels`, 'labels'],
        [`${showRoutes ? 'Hide' : 'Show'} route overlays`, 'routes'],
      ],
      Playback: [
        [autoRun ? 'Pause' : 'Play', 'play'],
        ['Previous event', 'previous'],
        ['Next event', 'next'],
        ['Jump to end', 'complete'],
      ],
      Help: [
        ['Keyboard shortcuts', 'shortcuts'],
        ['About MineSafe XR', 'about'],
      ],
    }

    const current = items[activeMenu] ?? []

    return (
      <div className="app-dropdown" onMouseLeave={() => setActiveMenu(null)}>
        {current.map(([label, action]) => (
          <button
            key={`${activeMenu}-${label}`}
            onClick={() => {
              if (action === 'select-worker') {
                setSelectedEntity('worker')
                setNotice('Worker 017 selected')
                setActiveMenu(null)
              } else {
                menuAction(action)
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
    )
  }

  const renderPropertyContent = () => {
    if (activeProperty === 'exercise') {
      return (
        <>
          <div className="risk-readout">
            <div>
              <span>Exercise state</span>
              <strong>{status}</strong>
            </div>
            <Icon name="sports_martial_arts" filled />
          </div>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('exercise')}>
              <Icon name={openSections.exercise !== false ? 'expand_more' : 'chevron_right'} />
              Exercise setup
            </button>
            {openSections.exercise !== false && (
              <div className="property-body">
                <div className="property-line"><span>Scenario</span><strong>MXR-01</strong></div>
                <div className="property-line"><span>Trainee</span><strong>Worker 017</strong></div>
                <div className="property-line"><span>Personnel</span><strong>6</strong></div>
                <div className="property-line"><span>Location</span><strong>North Decline</strong></div>
                <div className="property-line"><span>Level</span><strong>L4</strong></div>
              </div>
            )}
          </section>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('setupBrief')}>
              <Icon name={openSections.setupBrief !== false ? 'expand_more' : 'chevron_right'} />
              Training objective
            </button>
            {openSections.setupBrief !== false && (
              <div className="property-body cue-section">
                <p>Recognise the simulated fire, reject Route A when unsafe, and reach Refuge Chamber 2.</p>
              </div>
            )}
          </section>
        </>
      )
    }

    if (activeProperty === 'environment') {
      return (
        <>
          <div className="risk-readout">
            <div>
              <span>Environment source</span>
              <strong>Simulated</strong>
            </div>
            <Icon name="air" filled />
          </div>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('environment')}>
              <Icon name={openSections.environment !== false ? 'expand_more' : 'chevron_right'} />
              Mine conditions
            </button>
            {openSections.environment !== false && (
              <div className="property-body">
                <div className="condition-row">
                  <span>Airflow</span>
                  <div className="condition-value"><strong>{phase === 'idle' ? '2.8' : '1.7'}</strong><small>m/s</small></div>
                </div>
                <div className="meter"><i style={{ width: phase === 'idle' ? '76%' : '46%' }} /></div>
                <div className="condition-row">
                  <span>Visibility</span>
                  <div className="condition-value"><strong>{phase === 'idle' ? '92' : phase === 'alarm' ? '68' : '41'}</strong><small>%</small></div>
                </div>
                <div className="meter"><i style={{ width: phase === 'idle' ? '92%' : phase === 'alarm' ? '68%' : '41%' }} /></div>
                <div className="property-line"><span>Data type</span><strong>Training model</strong></div>
              </div>
            )}
          </section>
        </>
      )
    }

    if (activeProperty === 'routes') {
      return (
        <>
          <div className={`risk-readout risk-${phaseIndex >= 2 ? 'critical' : 'low'}`}>
            <div>
              <span>Primary escapeway</span>
              <strong>{phaseIndex >= 2 ? 'Blocked' : 'Open'}</strong>
            </div>
            <Icon name={phaseIndex >= 2 ? 'block' : 'route'} filled />
          </div>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('routes')}>
              <Icon name={openSections.routes !== false ? 'expand_more' : 'chevron_right'} />
              Route status
            </button>
            {openSections.routes !== false && (
              <div className="property-body">
                <div className="property-line"><span>Route A</span><strong className={phaseIndex >= 2 ? 'value-danger' : 'value-safe'}>{phaseIndex >= 2 ? 'BLOCKED' : 'OPEN'}</strong></div>
                <div className="property-line"><span>Refuge Chamber 2</span><strong>164 m</strong></div>
                <div className="property-line"><span>Route overlay</span><strong>{showRoutes ? 'Visible' : 'Hidden'}</strong></div>
              </div>
            )}
          </section>
        </>
      )
    }

    if (activeProperty === 'assessment') {
      return (
        <>
          <div className="risk-readout">
            <div>
              <span>Exercise progress</span>
              <strong>{phase === 'complete' ? 'Complete' : `${phaseIndex}/4 events`}</strong>
            </div>
            <Icon name="fact_check" filled />
          </div>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('assessment')}>
              <Icon name={openSections.assessment !== false ? 'expand_more' : 'chevron_right'} />
              Trainee assessment
            </button>
            {openSections.assessment !== false && (
              <div className="property-body action-list">
                <RadioAction
                  label="Hazard recognised"
                  checked={phaseIndex >= 1 || manualAssessment.hazard}
                  onSelect={() => setManualAssessment((value) => ({ ...value, hazard: true }))}
                />
                <RadioAction
                  label="Unsafe route rejected"
                  checked={phaseIndex >= 3 || manualAssessment.route}
                  onSelect={() => setManualAssessment((value) => ({ ...value, route: true }))}
                />
                <RadioAction
                  label="Alternate route selected"
                  checked={phaseIndex >= 3 || manualAssessment.alternate}
                  onSelect={() => setManualAssessment((value) => ({ ...value, alternate: true }))}
                />
              </div>
            )}
          </section>
          <section className="property-section">
            <button className="property-heading" onClick={() => toggleSection('debrief')}>
              <Icon name={openSections.debrief !== false ? 'expand_more' : 'chevron_right'} />
              Debrief summary
            </button>
            {openSections.debrief !== false && (
              <div className="property-body">
                <div className="property-line"><span>Response time</span><strong>00:{String(elapsed).padStart(2, '0')}</strong></div>
                <div className="property-line"><span>Recorded events</span><strong>{visibleEvents.length}</strong></div>
                <div className="property-line"><span>Outcome</span><strong>{phase === 'complete' ? 'Refuge reached' : 'In progress'}</strong></div>
              </div>
            )}
          </section>
        </>
      )
    }

    return (
      <>
        <div className={`risk-readout risk-${risk.toLowerCase()}`}>
          <div>
            <span>Current training risk</span>
            <strong>{risk}</strong>
          </div>
          <Icon name={risk === 'Low' || risk === 'Controlled' ? 'verified_user' : 'warning'} filled />
        </div>

        <section className="property-section">
          <button className="property-heading" onClick={() => toggleSection('conditions')}>
            <Icon name={openSections.conditions ? 'expand_more' : 'chevron_right'} />
            Mine conditions
          </button>
          {openSections.conditions && (
            <div className="property-body">
              <div className="condition-row">
                <span>Airflow</span>
                <div className="condition-value"><strong>{phase === 'idle' ? '2.8' : '1.7'}</strong><small>m/s</small></div>
              </div>
              <div className="meter"><i style={{ width: phase === 'idle' ? '76%' : '46%' }} /></div>

              <div className="condition-row">
                <span>Visibility</span>
                <div className="condition-value"><strong>{phase === 'idle' ? '92' : phase === 'alarm' ? '68' : '41'}</strong><small>%</small></div>
              </div>
              <div className="meter"><i style={{ width: phase === 'idle' ? '92%' : phase === 'alarm' ? '68%' : '41%' }} /></div>

              <div className="property-line">
                <span>Primary escapeway</span>
                <strong className={phaseIndex >= 2 ? 'value-danger' : 'value-safe'}>{phaseIndex >= 2 ? 'BLOCKED' : 'OPEN'}</strong>
              </div>
              <div className="property-line">
                <span>Alternate refuge</span>
                <strong>164 m</strong>
              </div>
            </div>
          )}
        </section>

        <section className="property-section">
          <button className="property-heading" onClick={() => toggleSection('actions')}>
            <Icon name={openSections.actions ? 'expand_more' : 'chevron_right'} />
            Trainee actions
          </button>
          {openSections.actions && (
            <div className="property-body action-list">
              <div><Icon name={phaseIndex >= 1 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 1} /><span>Hazard recognised</span></div>
              <div><Icon name={phaseIndex >= 3 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3} /><span>Unsafe route rejected</span></div>
              <div><Icon name={phaseIndex >= 3 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3} /><span>Alternate route selected</span></div>
            </div>
          )}
        </section>

        <section className="property-section cue-section">
          <button className="property-heading" onClick={() => toggleSection('cue')}>
            <Icon name={openSections.cue ? 'expand_more' : 'chevron_right'} />
            Instructor cue
          </button>
          {openSections.cue && (
            <div className="property-body">
              <p>{instructorCue}</p>
            </div>
          )}
        </section>

        <section className="property-section">
          <button className="property-heading" onClick={() => toggleSection('systemAids')}>
            <Icon name={openSections.systemAids !== false ? 'expand_more' : 'chevron_right'} />
            System aids
          </button>
          {openSections.systemAids !== false && (
            <div className="property-body switch-list">
              <SystemSwitch
                label="Auto-advance events"
                checked={autoAdvance}
                onChange={(checked) => {
                  setAutoAdvance(checked)
                  if (!checked) setAutoRun(false)
                }}
              />
              <SystemSwitch
                label="Route guidance"
                checked={showRoutes}
                onChange={setShowRoutes}
              />
              <SystemSwitch
                label="Scene labels"
                checked={showLabels}
                onChange={setShowLabels}
              />
              <SystemSwitch
                label="Hazard banner"
                checked={showWarnings}
                onChange={setShowWarnings}
              />
              <SystemSwitch
                label="Viewport grid"
                checked={showGrid}
                onChange={setShowGrid}
              />
            </div>
          )}
        </section>
      </>
    )
  }

  const propertyTabs: Array<[PropertyTab, string, string]> = [
    ['exercise', 'tune', 'Exercise'],
    ['safety', 'health_and_safety', 'Safety'],
    ['environment', 'air', 'Environment'],
    ['routes', 'route', 'Routes'],
    ['assessment', 'fact_check', 'Assessment'],
  ]

  return (
    <main className="app-shell">
      <header className="app-menu-bar">
        <div className="brand-chip">
          <span className="brand-symbol"><Icon name="shield" filled /></span>
          <strong>MineSafe XR</strong>
        </div>

        <nav className="main-menu" aria-label="Application menu">
          {['File', 'Edit', 'Scenario', 'View', 'Playback', 'Help'].map((name) => (
            <button
              key={name}
              className={activeMenu === name ? 'active' : ''}
              onClick={() => setActiveMenu(activeMenu === name ? null : name)}
            >
              {name}
            </button>
          ))}
          {renderMenu()}
        </nav>

        <div className="top-status">
          <span className="prototype-tag">Desktop prototype</span>
          <span className={`status-indicator status-${phase}`}>
            <i /> {status}
          </span>
        </div>
      </header>

      <div className="workspace-tabs-bar">
        <div className="workspace-tabs">
          {(['Drill', 'Setup', 'Debrief'] as Workspace[]).map((name) => (
            <button
              key={name}
              className={workspace === name ? 'active' : ''}
              onClick={() => selectWorkspace(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="scene-file">MXR-01 - North Decline / Level 4</div>
      </div>

      <section className="editor-grid">
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
              aria-label={label}
              onClick={() => {
                setActiveTool(id)
                setNotice(`${label} tool active`)
              }}
            >
              <Icon name={icon} />
            </button>
          ))}
          <span className="tool-separator" />
          <button
            title="Frame selected"
            aria-label="Frame selected"
            onClick={() => {
              setCameraKey((value) => value + 1)
              setNotice('View framed on scene')
            }}
          >
            <Icon name="filter_center_focus" />
          </button>
        </aside>

        <aside className="outliner-panel">
          <div className="editor-header">
            <span>Scenario</span>
            <div className="editor-actions">
              <button title="Frame trainee" onClick={() => setSelectedEntity('worker')}><Icon name="search" /></button>
              <button title="Scenario options" onClick={() => setActiveMenu(activeMenu === 'Scenario' ? null : 'Scenario')}><Icon name="more_vert" /></button>
            </div>
          </div>

          <div className="scenario-name">
            <div className="scenario-glyph danger"><Icon name="local_fire_department" filled /></div>
            <div>
              <strong>Underground fire drill</strong>
              <span>North Decline - Level 4</span>
            </div>
          </div>

          <div className="tree-list">
            <button className="tree-row root" onClick={() => setSelectedEntity('scene')}><Icon name="expand_more" /><Icon name="folder_open" /> Training scene</button>
            <button className={`tree-row child ${selectedEntity === 'worker' ? 'selected' : ''}`} onClick={() => setSelectedEntity('worker')}><Icon name="person" /> Worker 017</button>
            <button className={`tree-row child ${selectedEntity === 'loader' ? 'selected' : ''}`} onClick={() => setSelectedEntity('loader')}><Icon name="local_shipping" /> Loader bay</button>
            <button className={`tree-row child ${selectedEntity === 'route' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('route'); setActiveProperty('routes') }}><Icon name="route" /> Route A</button>
            <button className={`tree-row child ${selectedEntity === 'refuge' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('refuge'); setActiveProperty('routes') }}><Icon name="meeting_room" /> Refuge Chamber 2</button>
            <button className={`tree-row child ${selectedEntity === 'ventilation' ? 'selected' : ''}`} onClick={() => { setSelectedEntity('ventilation'); setActiveProperty('environment') }}><Icon name="air" /> Ventilation zone</button>
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
            <p>Recognise the simulated fire, reject Route A when it becomes unsafe, and reach Refuge Chamber 2.</p>
          </div>
        </aside>

        <section className="viewport-editor">
          <div className="viewport-header editor-header">
            <div className="viewport-mode">
              <button
                className={activeTool === 'select' ? 'active' : ''}
                onClick={() => {
                  setActiveTool('select')
                  setNotice('Object selection mode')
                }}
              >
                <Icon name="deployed_code" /> Object mode
              </button>
              <span className="divider" />
              <button
                title={showLabels ? 'Hide labels' : 'Show labels'}
                className={showLabels ? 'active-icon' : ''}
                onClick={() => setShowLabels((value) => !value)}
              >
                <Icon name="layers" />
              </button>
              <button
                title={showRoutes ? 'Hide route overlays' : 'Show route overlays'}
                className={showRoutes ? 'active-icon' : ''}
                onClick={() => setShowRoutes((value) => !value)}
              >
                <Icon name="timeline" />
              </button>
            </div>

            <div className="viewport-actions">
              <button
                title="Toggle viewport grid"
                className={showGrid ? 'active-icon' : ''}
                onClick={() => setShowGrid((value) => !value)}
              >
                <Icon name="grid_4x4" />
              </button>
              <button
                title="Wireframe"
                className={viewStyle === 'wireframe' ? 'active-icon' : ''}
                onClick={() => setViewStyle('wireframe')}
              >
                <Icon name="grid_on" />
              </button>
              <button
                title="Solid"
                className={viewStyle === 'solid' ? 'active-icon' : ''}
                onClick={() => setViewStyle('solid')}
              >
                <Icon name="circle" filled />
              </button>
              <button
                title="Rendered"
                className={viewStyle === 'rendered' ? 'active-icon' : ''}
                onClick={() => setViewStyle('rendered')}
              >
                <Icon name="view_in_ar" />
              </button>
            </div>
          </div>

          <div className={`viewport-stage ${showGrid ? '' : 'grid-hidden'}`}>
            <MineScene
              key={cameraKey}
              phase={phase}
              viewStyle={viewStyle}
              showRoutes={showRoutes}
              showLabels={showLabels}
            />

            <div className="axis-gizmo" aria-hidden="true">
              <span className="axis-z">Z</span>
              <span className="axis-y">Y</span>
              <span className="axis-x">X</span>
            </div>

            {showLabels && (
              <div className="viewport-overlay top-left">
                <strong>North Decline / L4</strong>
                <span>Training environment - simulated data</span>
              </div>
            )}

            {showWarnings && phase !== 'idle' && phase !== 'complete' && (
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
          <div className="properties-tabs" aria-label="Properties tabs">
            {propertyTabs.map(([id, icon, label]) => (
              <button
                key={id}
                className={activeProperty === id ? 'active' : ''}
                title={label}
                aria-label={label}
                onClick={() => setActiveProperty(id)}
              >
                <Icon name={icon} filled={activeProperty === id} />
              </button>
            ))}
          </div>

          <div className="properties-content">
            <div className="editor-header properties-titlebar">
              <span>{propertyTabs.find(([id]) => id === activeProperty)?.[2]}</span>
              <button
                title="Panel options"
                onClick={() => setNotice(`${propertyTabs.find(([id]) => id === activeProperty)?.[2]} panel active`)}
              >
                <Icon name="more_horiz" />
              </button>
            </div>

            {renderPropertyContent()}

            <div className="exercise-controls">
              <button className="primary-action" onClick={toggleRun}>
                <Icon name={autoRun ? 'pause' : 'play_arrow'} filled />
                {phase === 'idle' ? 'Start drill' : phase === 'complete' ? 'Run again' : autoRun ? 'Pause drill' : 'Resume drill'}
              </button>
              <button className="secondary-action" onClick={advance} disabled={phase === 'complete'}>
                <Icon name="add_alert" /> Next inject
              </button>
              <button className="icon-action" onClick={reset} title="Restart exercise" aria-label="Restart exercise">
                <Icon name="restart_alt" />
              </button>
            </div>
          </div>
        </aside>
      </section>

      <section className="timeline-editor">
        <div className="timeline-toolbar">
          <span className="timeline-title">Exercise timeline</span>
          <div className="playback-controls">
            <button onClick={reset} title="Jump to start"><Icon name="first_page" /></button>
            <button onClick={previous} title="Previous event"><Icon name="skip_previous" /></button>
            <button onClick={toggleRun} className="play-control" title={autoRun ? 'Pause' : 'Play'}>
              <Icon name={autoRun ? 'pause' : 'play_arrow'} filled />
            </button>
            <button onClick={advance} title="Next event" disabled={phase === 'complete'}><Icon name="skip_next" /></button>
            <button onClick={jumpEnd} title="Jump to end"><Icon name="last_page" /></button>
          </div>
          <div className="frame-readout">00:{String(elapsed).padStart(2, '0')} / 00:36</div>
        </div>

        <div className="timeline-track">
          <div className="track-line" />
          {PHASES.map((item, index) => {
            const event = EVENTS[item]
            const reached = index <= phaseIndex
            return (
              <button
                key={item}
                className={`timeline-marker ${reached ? `reached tone-${event.tone}` : ''} ${item === phase ? 'current' : ''}`}
                style={{ left: `${(index / (PHASES.length - 1)) * 100}%` }}
                onClick={() => goToPhase(item)}
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
          {visibleEvents.slice(-3).map((event) => (
            <button
              key={event.title}
              className={`event-chip tone-${event.tone}`}
              onClick={() => {
                const target = PHASES.find((item) => EVENTS[item].title === event.title)
                if (target) goToPhase(target)
              }}
            >
              <span>{event.time}</span>
              <strong>{event.title}</strong>
            </button>
          ))}
          {phase === 'complete' && (
            <button className="debrief-ready" onClick={() => selectWorkspace('Debrief')}>
              <Icon name="task_alt" filled /> Open debrief
            </button>
          )}
        </div>
      </section>

      <footer className="status-bar">
        <div><Icon name="info" /> Prototype - simulated training data only</div>
        <div className="status-right">
          <span>Worker 017</span>
          <span>Route A: {phaseIndex >= 2 ? 'Blocked' : 'Open'}</span>
          <span>Refuge 2: 164 m</span>
        </div>
      </footer>

      {notice && <div className="app-toast">{notice}</div>}

      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <section className="help-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <strong>MineSafe XR controls</strong>
              <button onClick={() => setHelpOpen(false)}><Icon name="close" /></button>
            </header>
            <div>
              <p><strong>Viewport:</strong> drag to orbit, right-drag to pan, wheel to zoom.</p>
              <p><strong>Timeline:</strong> click any event marker to inspect that drill state.</p>
              <p><strong>Scenario:</strong> use Next inject or Scenario menu to introduce events manually.</p>
              <p><strong>Prototype:</strong> all displayed hazard and environment values are simulated training data.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App