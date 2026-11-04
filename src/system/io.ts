import type { TrainingData, TrainingSession } from './types'
import { csvCell, drillScore, sessionSnapshot } from './model'
import { pausedData } from './validation'

export function download(name: string, content: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function downloadBackup(data: TrainingData) {
  download('MineSafe-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({
    format: 'minesafe.workspace.v2', exportedAt: new Date().toISOString(), data: pausedData(data),
  }, null, 2))
}
export function downloadSession(session: TrainingSession) {
  download(session.scenario.code + '-' + session.id + '.json', JSON.stringify({
    format: 'minesafe.session.v2', session: sessionSnapshot(session),
  }, null, 2))
}
export function sessionsCsv(sessions: TrainingSession[]): string {
  const header = ['Drill ID', 'Date', 'Scenario', 'Scenario version', 'Mine area', 'Participants', 'Instructor', 'Outcome', 'Active seconds', 'Drill score', 'Withdrawn route attempts', 'Debrief notes']
  return '\ufeff' + [header, ...sessions.map(s => [s.id, new Date(s.createdAt).toISOString(), s.scenario.title,
    s.scenario.version, s.scenario.area, s.participants.map(p => p.name).join('; '), s.instructor,
    s.outcome, Math.round(s.elapsedMs / 1000), drillScore(s) ?? '', s.mistakes, s.notes])]
    .map(row => row.map(csvCell).join(',')).join('\r\n')
}
