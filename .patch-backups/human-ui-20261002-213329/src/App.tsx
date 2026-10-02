import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flame,
  MapPin,
  Play,
  RotateCcw,
  ShieldCheck,
  Siren,
  Users,
} from 'lucide-react'
import MineScene, { type DrillPhase } from './components/MineScene'

type EventItem = {
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'warning' | 'danger' | 'safe'
}

const PHASES: DrillPhase[] = ['idle', 'alarm', 'blocked', 'reroute', 'complete']

const EVENTS: Record<DrillPhase, EventItem> = {
  idle: {
    time: '00:00',
    title: 'Normal operations',
    detail: 'North Decline training zone is stable.',
    tone: 'neutral',
  },
  alarm: {
    time: '00:08',
    title: 'Simulated fire detected',
    detail: 'Loader bay temperature event triggered.',
    tone: 'danger',
  },
  blocked: {
    time: '00:16',
    title: 'Primary escapeway compromised',
    detail: 'Smoke spread marks Route A as unsafe.',
    tone: 'danger',
  },
  reroute: {
    time: '00:24',
    title: 'Alternate route selected',
    detail: 'Trainee redirected toward Refuge Chamber 2.',
    tone: 'safe',
  },
  complete: {
    time: '00:36',
    title: 'Drill complete',
    detail: 'Response captured for replay and debrief.',
    tone: 'safe',
  },
}

function App() {
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [autoRun, setAutoRun] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const phaseIndex = PHASES.indexOf(phase)
  const visibleEvents = useMemo(() => PHASES.slice(0, phaseIndex + 1).map((item) => EVENTS[item]), [phaseIndex])

  useEffect(() => {
    if (!autoRun || phase === 'complete') return
    const timer = window.setTimeout(() => {
      setElapsed((value) => value + 8)
      setPhase(PHASES[Math.min(PHASES.indexOf(phase) + 1, PHASES.length - 1)])
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [autoRun, phase])

  useEffect(() => {
    if (phase === 'complete') setAutoRun(false)
  }, [phase])

  const reset = () => {
    setPhase('idle')
    setElapsed(0)
    setAutoRun(false)
  }

  const start = () => {
    if (phase === 'complete') reset()
    setPhase('alarm')
    setElapsed(8)
    setAutoRun(true)
  }

  const advance = () => {
    const next = PHASES[Math.min(phaseIndex + 1, PHASES.length - 1)]
    setPhase(next)
    setElapsed(Math.min(elapsed + 8, 36))
  }

  const status = phase === 'idle' ? 'MONITORING' : phase === 'complete' ? 'DEBRIEF READY' : 'DRILL ACTIVE'
  const risk = phase === 'idle' ? 'LOW' : phase === 'alarm' ? 'HIGH' : phase === 'blocked' ? 'CRITICAL' : 'CONTROLLED'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <div className="eyebrow">EPHEMERAL / SAFETY SYSTEMS</div>
            <h1>MineSafe XR</h1>
          </div>
        </div>

        <div className="header-meta">
          <div className="prototype-pill">DESKTOP PROTOTYPE</div>
          <div className={`system-state state-${phase === 'idle' ? 'safe' : phase === 'complete' ? 'complete' : 'active'}`}>
            <span className="status-dot" />
            {status}
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel scenario-panel">
          <div className="panel-heading">
            <span>SCENARIO</span>
            <span className="scenario-code">MXR-01</span>
          </div>

          <div className="scenario-title">
            <Flame size={22} />
            <div>
              <h2>Underground Fire</h2>
              <p>North Decline / Level 4</p>
            </div>
          </div>

          <div className="metric-stack">
            <div className="metric-row"><span><MapPin size={16} /> Trainee</span><strong>Worker 017</strong></div>
            <div className="metric-row"><span><Users size={16} /> Personnel</span><strong>06</strong></div>
            <div className="metric-row"><span><Clock3 size={16} /> Elapsed</span><strong>00:{String(elapsed).padStart(2, '0')}</strong></div>
          </div>

          <div className="objective-card">
            <span className="micro-label">OBJECTIVE</span>
            <p>Recognise the simulated fire, reject the compromised escapeway and reach Refuge Chamber 2.</p>
          </div>

          <div className="controls">
            <button className="btn btn-primary" onClick={start} disabled={autoRun && phase !== 'complete'}>
              <Play size={17} fill="currentColor" />
              {phase === 'idle' ? 'Run demonstration' : phase === 'complete' ? 'Run again' : 'Demo running'}
            </button>
            <button className="btn btn-secondary" onClick={advance} disabled={phase === 'complete' || autoRun}>
              Advance event <ArrowRight size={17} />
            </button>
            <button className="btn btn-ghost" onClick={reset}><RotateCcw size={16} /> Reset scenario</button>
          </div>

          <p className="hint">Drag the 3D view to inspect the training environment.</p>
        </aside>

        <section className="scene-panel">
          <MineScene phase={phase} />
          <div className="scene-caption">
            <span className="live-marker">3D TRAINING ENVIRONMENT</span>
            <span>Digital mine scene • simulated data</span>
          </div>
          {phase !== 'idle' && phase !== 'complete' && (
            <div className="alert-banner">
              <Siren size={18} />
              <span><strong>DRILL MODE</strong> — all hazards shown are simulated.</span>
            </div>
          )}
        </section>

        <aside className="panel intelligence-panel">
          <div className="panel-heading"><span>SAFETY STATE</span><Activity size={17} /></div>

          <div className={`risk-card risk-${risk.toLowerCase()}`}>
            <span className="micro-label">CURRENT TRAINING RISK</span>
            <strong>{risk}</strong>
            <p>{phase === 'idle' ? 'No simulated emergency active.' : phase === 'alarm' ? 'Fire event detected near loader bay.' : phase === 'blocked' ? 'Primary escapeway is no longer safe.' : 'Alternate escapeway is active.'}</p>
          </div>

          <div className="signal-grid">
            <div className="signal-card"><span>Airflow</span><strong>{phase === 'idle' ? '2.8 m/s' : '1.7 m/s'}</strong><small>{phase === 'idle' ? 'Stable' : 'Reduced'}</small></div>
            <div className="signal-card"><span>Visibility</span><strong>{phase === 'idle' ? '92%' : phase === 'alarm' ? '68%' : '41%'}</strong><small>Simulated</small></div>
            <div className="signal-card"><span>Route A</span><strong>{phase === 'idle' || phase === 'alarm' ? 'OPEN' : 'BLOCKED'}</strong><small>Primary</small></div>
            <div className="signal-card"><span>Refuge 2</span><strong>164 m</strong><small>Alternate</small></div>
          </div>

          <div className="decision-card">
            <span className="micro-label">DECISION CAPTURE</span>
            <div className="decision-row"><span>Hazard recognised</span>{phase === 'idle' ? <span className="pending">Pending</span> : <CheckCircle2 size={18} />}</div>
            <div className="decision-row"><span>Unsafe route rejected</span>{phaseIndex < 3 ? <span className="pending">Pending</span> : <CheckCircle2 size={18} />}</div>
            <div className="decision-row"><span>Alternate route chosen</span>{phaseIndex < 3 ? <span className="pending">Pending</span> : <CheckCircle2 size={18} />}</div>
          </div>
        </aside>
      </section>

      <section className="timeline-panel">
        <div className="timeline-heading">
          <div><span className="micro-label">INCIDENT → TRAINING LOOP</span><h3>Exercise timeline</h3></div>
          <div className="timeline-note"><AlertTriangle size={15} /> Prototype uses simulated scenario data</div>
        </div>
        <div className="timeline">
          {visibleEvents.map((event, index) => (
            <article className={`timeline-event tone-${event.tone}`} key={`${event.title}-${index}`}>
              <span className="event-time">{event.time}</span>
              <span className="event-node" />
              <div><strong>{event.title}</strong><p>{event.detail}</p></div>
            </article>
          ))}
        </div>
        {phase === 'complete' && (
          <div className="debrief-strip">
            <CheckCircle2 size={20} />
            <strong>Debrief ready.</strong>
            <span>Response time 00:36 • route corrected • exercise evidence stored for replay.</span>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
