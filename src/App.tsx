import { useEffect, useMemo, useState } from 'react'
import MineScene, { type DrillPhase } from './components/MineScene'

type EventItem = {
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'danger' | 'safe'
}

const PHASES: DrillPhase[] = ['idle', 'alarm', 'blocked', 'reroute', 'complete']

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

function App() {
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [autoRun, setAutoRun] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [workspace, setWorkspace] = useState<'Drill' | 'Setup' | 'Debrief'>('Drill')

  const phaseIndex = PHASES.indexOf(phase)
  const visibleEvents = useMemo(
    () => PHASES.slice(0, phaseIndex + 1).map((item) => EVENTS[item]),
    [phaseIndex],
  )

  useEffect(() => {
    if (!autoRun || phase === 'complete') return

    const timer = window.setTimeout(() => {
      setElapsed((value) => Math.min(value + 8, 36))
      setPhase(PHASES[Math.min(PHASES.indexOf(phase) + 1, PHASES.length - 1)])
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [autoRun, phase])

  useEffect(() => {
    if (phase === 'complete') {
      setAutoRun(false)
      setWorkspace('Debrief')
    }
  }, [phase])

  const reset = () => {
    setPhase('idle')
    setElapsed(0)
    setAutoRun(false)
    setWorkspace('Drill')
  }

  const start = () => {
    if (phase === 'complete') {
      setPhase('idle')
      setElapsed(0)
    }
    setWorkspace('Drill')
    setPhase('alarm')
    setElapsed(8)
    setAutoRun(true)
  }

  const advance = () => {
    if (phase === 'complete') return
    const next = PHASES[Math.min(phaseIndex + 1, PHASES.length - 1)]
    setPhase(next)
    setElapsed(Math.min(elapsed + 8, 36))
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

  return (
    <main className="app-shell">
      <header className="app-menu-bar">
        <div className="brand-chip">
          <span className="brand-symbol"><Icon name="shield" filled /></span>
          <strong>MineSafe XR</strong>
        </div>

        <nav className="main-menu" aria-label="Application menu">
          <button>File</button>
          <button>Edit</button>
          <button>Scenario</button>
          <button>View</button>
          <button>Playback</button>
          <button>Help</button>
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
          {(['Drill', 'Setup', 'Debrief'] as const).map((name) => (
            <button
              key={name}
              className={workspace === name ? 'active' : ''}
              onClick={() => setWorkspace(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="scene-file">MXR-01 Â· North Decline / Level 4</div>
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
              onClick={() => setActiveTool(id)}
            >
              <Icon name={icon} />
            </button>
          ))}
          <span className="tool-separator" />
          <button title="Frame selected" aria-label="Frame selected"><Icon name="filter_center_focus" /></button>
        </aside>

        <aside className="outliner-panel">
          <div className="editor-header">
            <span>Scenario</span>
            <div className="editor-actions">
              <button title="Search"><Icon name="search" /></button>
              <button title="Options"><Icon name="more_vert" /></button>
            </div>
          </div>

          <div className="scenario-name">
            <div className="scenario-glyph danger"><Icon name="local_fire_department" filled /></div>
            <div>
              <strong>Underground fire drill</strong>
              <span>North Decline Â· Level 4</span>
            </div>
          </div>

          <div className="tree-list">
            <div className="tree-row root"><Icon name="expand_more" /><Icon name="folder_open" /> Training scene</div>
            <div className="tree-row child selected"><Icon name="person" /> Worker 017</div>
            <div className="tree-row child"><Icon name="local_shipping" /> Loader bay</div>
            <div className="tree-row child"><Icon name="route" /> Route A</div>
            <div className="tree-row child"><Icon name="meeting_room" /> Refuge Chamber 2</div>
            <div className="tree-row child"><Icon name="air" /> Ventilation zone</div>
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
              <button className="active"><Icon name="deployed_code" /> Object mode</button>
              <span className="divider" />
              <button title="Viewport overlays"><Icon name="layers" /></button>
              <button title="Route overlays" className="active-icon"><Icon name="timeline" /></button>
            </div>
            <div className="viewport-actions">
              <button title="Wireframe"><Icon name="grid_4x4" /></button>
              <button title="Solid" className="active-icon"><Icon name="circle" filled /></button>
              <button title="Rendered"><Icon name="view_in_ar" /></button>
            </div>
          </div>

          <div className="viewport-stage">
            <MineScene phase={phase} />

            <div className="axis-gizmo" aria-hidden="true">
              <span className="axis-z">Z</span>
              <span className="axis-y">Y</span>
              <span className="axis-x">X</span>
            </div>

            <div className="viewport-overlay top-left">
              <strong>North Decline / L4</strong>
              <span>Training environment Â· simulated data</span>
            </div>

            {phase !== 'idle' && phase !== 'complete' && (
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
            {[
              ['tune', 'Exercise'],
              ['health_and_safety', 'Safety'],
              ['air', 'Environment'],
              ['route', 'Routes'],
              ['fact_check', 'Assessment'],
            ].map(([icon, label], index) => (
              <button key={label} className={index === 1 ? 'active' : ''} title={label} aria-label={label}>
                <Icon name={icon} filled={index === 1} />
              </button>
            ))}
          </div>

          <div className="properties-content">
            <div className="editor-header properties-titlebar">
              <span>Safety</span>
              <button title="Panel options"><Icon name="more_horiz" /></button>
            </div>

            <div className={`risk-readout risk-${risk.toLowerCase()}`}>
              <div>
                <span>Current training risk</span>
                <strong>{risk}</strong>
              </div>
              <Icon name={risk === 'Low' || risk === 'Controlled' ? 'verified_user' : 'warning'} filled />
            </div>

            <section className="property-section">
              <button className="property-heading"><Icon name="expand_more" /> Mine conditions</button>
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
            </section>

            <section className="property-section">
              <button className="property-heading"><Icon name="expand_more" /> Trainee actions</button>
              <div className="property-body action-list">
                <div><Icon name={phaseIndex >= 1 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 1} /><span>Hazard recognised</span></div>
                <div><Icon name={phaseIndex >= 3 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3} /><span>Unsafe route rejected</span></div>
                <div><Icon name={phaseIndex >= 3 ? 'check_circle' : 'radio_button_unchecked'} filled={phaseIndex >= 3} /><span>Alternate route selected</span></div>
              </div>
            </section>

            <section className="property-section cue-section">
              <button className="property-heading"><Icon name="expand_more" /> Instructor cue</button>
              <div className="property-body">
                <p>{instructorCue}</p>
              </div>
            </section>

            <div className="exercise-controls">
              <button className="primary-action" onClick={start} disabled={autoRun && phase !== 'complete'}>
                <Icon name="play_arrow" filled />
                {phase === 'idle' ? 'Start drill' : phase === 'complete' ? 'Run again' : 'Running'}
              </button>
              <button className="secondary-action" onClick={advance} disabled={phase === 'complete' || autoRun}>
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
            <button title="Previous event"><Icon name="skip_previous" /></button>
            <button onClick={autoRun ? () => setAutoRun(false) : start} className="play-control" title={autoRun ? 'Pause' : 'Play'}>
              <Icon name={autoRun ? 'pause' : 'play_arrow'} filled />
            </button>
            <button onClick={advance} title="Next event"><Icon name="skip_next" /></button>
            <button title="Jump to end"><Icon name="last_page" /></button>
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
                onClick={() => {
                  setAutoRun(false)
                  setPhase(item)
                  setElapsed(Math.min(index * 8, 36))
                }}
                title={`${event.time} â€” ${event.title}`}
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
            <div key={event.title} className={`event-chip tone-${event.tone}`}>
              <span>{event.time}</span>
              <strong>{event.title}</strong>
            </div>
          ))}
          {phase === 'complete' && (
            <div className="debrief-ready"><Icon name="task_alt" filled /> Exercise ready for debrief</div>
          )}
        </div>
      </section>

      <footer className="status-bar">
        <div><Icon name="info" /> Prototype Â· simulated training data only</div>
        <div className="status-right">
          <span>Worker 017</span>
          <span>Route A: {phaseIndex >= 2 ? 'Blocked' : 'Open'}</span>
          <span>Refuge 2: 164 m</span>
        </div>
      </footer>
    </main>
  )
}

export default App
