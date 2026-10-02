import { useEffect, useMemo, useState } from 'react'
import Icon from './components/Icon'
import TimelineDock from './components/TimelineDock'
import DrillScreen from './screens/DrillScreen'
import SetupScreen from './screens/SetupScreen'
import DebriefScreen from './screens/DebriefScreen'
import LibraryScreen from './screens/LibraryScreen'
import type { DrillPhase, ScenarioKind, ViewStyle, Workspace } from './types'
import { PHASES, PHASE_TIME, SCENARIOS, getEvents } from './types'

function App() {
  const [workspace, setWorkspace] = useState<Workspace>('Drill')
  const [scenario, setScenario] = useState<ScenarioKind>('fire')
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [autoRun, setAutoRun] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showWarnings, setShowWarnings] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [viewStyle, setViewStyle] = useState<ViewStyle>('solid')
  const [assessment, setAssessment] = useState({
    hazard: false,
    route: false,
    alternate: false,
  })
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const definition = SCENARIOS[scenario]
  const events = useMemo(() => getEvents(scenario), [scenario])
  const phaseIndex = PHASES.indexOf(phase)
  const elapsed = PHASE_TIME[phase]

  useEffect(() => {
    if (!autoRun || !autoAdvance || phase === 'complete') return

    const timer = window.setTimeout(() => {
      setPhase(PHASES[Math.min(PHASES.indexOf(phase) + 1, PHASES.length - 1)])
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [autoRun, autoAdvance, phase])

  useEffect(() => {
    if (phase === 'complete') {
      setAutoRun(false)
      setWorkspace('Debrief')
    }
  }, [phase])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 1800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reset = () => {
    setPhase('idle')
    setAutoRun(false)
    setAssessment({ hazard: false, route: false, alternate: false })
    setNotice('Exercise reset')
  }

  const startPause = () => {
    if (phase === 'complete') {
      setPhase('alarm')
      setWorkspace('Drill')
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

  const startFromSetup = () => {
    setPhase('idle')
    setAssessment({ hazard: false, route: false, alternate: false })
    setWorkspace('Drill')
    setNotice(`${definition.code} loaded`)
  }

  const loadScenario = (kind: ScenarioKind, target: Workspace) => {
    setScenario(kind)
    setPhase('idle')
    setAssessment({ hazard: false, route: false, alternate: false })
    setAutoRun(false)
    setWorkspace(target)
    setNotice(`${SCENARIOS[kind].code} loaded`)
  }

  const exportSession = () => {
    const data = {
      product: 'MineSafe XR',
      scenario: definition,
      phase,
      elapsed,
      trainee: 'Worker 017',
      personnel: 6,
      assessment,
      events: events.slice(0, phaseIndex + 1),
      prototype: true,
      note: 'Simulated training data only',
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${definition.code.toLowerCase()}-session.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('Session exported')
  }

  const menuAction = (action: string) => {
    setActiveMenu(null)

    if (action === 'reset') reset()
    if (action === 'export') exportSession()
    if (action === 'setup') setWorkspace('Scenario Setup')
    if (action === 'library') setWorkspace('Scenario Library')
    if (action === 'alarm') setPhase('alarm')
    if (action === 'blocked') setPhase('blocked')
    if (action === 'reroute') setPhase('reroute')
    if (action === 'complete') jumpEnd()
    if (action === 'grid') setShowGrid((value) => !value)
    if (action === 'labels') setShowLabels((value) => !value)
    if (action === 'routes') setShowRoutes((value) => !value)
    if (action === 'play') startPause()
    if (action === 'previous') previous()
    if (action === 'next') advance()
    if (action === 'help') setHelpOpen(true)
  }

  const menuItems: Record<string, Array<[string, string]>> = {
    File: [
      ['Scenario library', 'library'],
      ['Export session', 'export'],
      ['Reset exercise', 'reset'],
    ],
    Edit: [
      ['Scenario setup', 'setup'],
      ['Reset exercise', 'reset'],
    ],
    Scenario: [
      ['Trigger hazard', 'alarm'],
      ['Withdraw primary route', 'blocked'],
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
      ['Controls and prototype note', 'help'],
    ],
  }

  return (
    <main className="app-shell">
      <header className="app-menu-bar">
        <div className="brand-chip">
          <span className="brand-symbol"><Icon name="shield" filled /></span>
          <strong>MineSafe XR</strong>
        </div>

        <nav className="main-menu">
          {Object.keys(menuItems).map((menu) => (
            <div className="menu-slot" key={menu}>
              <button className={activeMenu === menu ? 'active' : ''} onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}>
                {menu}
              </button>
              {activeMenu === menu && (
                <div className="app-dropdown" onMouseLeave={() => setActiveMenu(null)}>
                  {menuItems[menu].map(([label, action]) => (
                    <button key={`${menu}-${label}`} onClick={() => menuAction(action)}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="top-status">
          <span className="prototype-tag">Desktop prototype</span>
          <span className={`status-indicator status-${phase}`}><i /> {phase === 'idle' ? 'Ready' : phase === 'complete' ? 'Debrief ready' : 'Drill active'}</span>
        </div>
      </header>

      <div className="workspace-tabs-bar">
        <div className="workspace-tabs">
          {(['Drill', 'Scenario Setup', 'Debrief', 'Scenario Library'] as Workspace[]).map((name) => (
            <button key={name} className={workspace === name ? 'active' : ''} onClick={() => setWorkspace(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="scene-file">{definition.code} - {definition.subtitle}</div>
      </div>

      <section className="workspace-content">
        {workspace === 'Drill' && (
          <DrillScreen
            scenario={scenario}
            phase={phase}
            autoRun={autoRun}
            autoAdvance={autoAdvance}
            showRoutes={showRoutes}
            showLabels={showLabels}
            showWarnings={showWarnings}
            showGrid={showGrid}
            viewStyle={viewStyle}
            assessment={assessment}
            onAssessment={setAssessment}
            onAutoAdvance={(checked) => { setAutoAdvance(checked); if (!checked) setAutoRun(false) }}
            onShowRoutes={setShowRoutes}
            onShowLabels={setShowLabels}
            onShowWarnings={setShowWarnings}
            onShowGrid={setShowGrid}
            onViewStyle={setViewStyle}
            onStartPause={startPause}
            onAdvance={advance}
            onReset={reset}
            onNotice={setNotice}
          />
        )}

        {workspace === 'Scenario Setup' && (
          <SetupScreen
            scenario={scenario}
            phase={phase}
            viewStyle={viewStyle}
            showRoutes={showRoutes}
            showLabels={showLabels}
            showGrid={showGrid}
            autoAdvance={autoAdvance}
            onScenario={setScenario}
            onPhase={setPhase}
            onViewStyle={setViewStyle}
            onShowRoutes={setShowRoutes}
            onShowLabels={setShowLabels}
            onShowGrid={setShowGrid}
            onAutoAdvance={(checked) => { setAutoAdvance(checked); if (!checked) setAutoRun(false) }}
            onStartDrill={startFromSetup}
            onNotice={setNotice}
          />
        )}

        {workspace === 'Debrief' && (
          <DebriefScreen
            scenario={scenario}
            phase={phase}
            viewStyle={viewStyle}
            showRoutes={showRoutes}
            showLabels={showLabels}
            assessment={assessment}
            onPhase={(next) => { setAutoRun(false); setPhase(next) }}
            onReplay={() => { setPhase('idle'); setAutoRun(false); setNotice('Replay reset') }}
            onExport={exportSession}
          />
        )}

        {workspace === 'Scenario Library' && (
          <LibraryScreen
            activeScenario={scenario}
            onLoad={(kind) => loadScenario(kind, 'Drill')}
            onOpenSetup={(kind) => loadScenario(kind, 'Scenario Setup')}
          />
        )}
      </section>

      <TimelineDock
        scenario={scenario}
        phase={phase}
        autoRun={autoRun}
        onPhase={(next) => { setAutoRun(false); setPhase(next) }}
        onReset={reset}
        onPrevious={previous}
        onPlayPause={startPause}
        onNext={advance}
        onEnd={jumpEnd}
      />

      <footer className="status-bar">
        <div><Icon name="info" /> Prototype - simulated training data only</div>
        <div className="status-right">
          <span>{definition.code}</span>
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
              <p><strong>Workspaces:</strong> Drill runs the exercise, Scenario Setup configures it, Debrief reviews it, and Scenario Library loads another prototype scenario.</p>
              <p><strong>Viewport:</strong> drag to orbit, right-drag to pan, and use the wheel to zoom.</p>
              <p><strong>Timeline:</strong> click any event marker to inspect that drill state.</p>
              <p><strong>Prototype note:</strong> all hazard, route and environment values shown here are simulated training data.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App