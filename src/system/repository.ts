import { isSession } from '../session'
import type { TrainingData, TrainingSession } from './types'
import { copy, initialData, newTraining } from './model'
import { pausedData, validateData } from './validation'

type Stored = { revision: number; data: TrainingData }
export class WorkspaceRepository {
  private db: IDBDatabase | null = null
  async open(): Promise<void> {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('minesafe-training', 1)
      request.onupgradeneeded = () => { request.result.createObjectStore('workspace') }
      request.onerror = () => reject(new Error('The local database could not be opened.'))
      request.onblocked = () => reject(new Error('Close other MineSafe XR windows, then reopen this workspace.'))
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    })
  }
  async load(): Promise<Stored> {
    const stored = await new Promise<Stored | undefined>((resolve, reject) => {
      const request = this.db!.transaction('workspace', 'readonly').objectStore('workspace').get('main')
      request.onsuccess = () => resolve(request.result as Stored | undefined)
      request.onerror = () => reject(new Error('The saved workspace could not be read.'))
    })
    if (stored) return { revision: stored.revision, data: pausedData(validateData(stored.data)) }
    return { revision: 0, data: migrateEarlierWorkspace(initialData()) }
  }
  async save(data: TrainingData, expectedRevision: number): Promise<number> {
    validateData(data)
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('workspace', 'readwrite')
      const store = transaction.objectStore('workspace')
      let conflict = false
      const request = store.get('main')
      request.onsuccess = () => {
        const current = request.result as Stored | undefined
        if ((current?.revision ?? 0) !== expectedRevision) { conflict = true; transaction.abort(); return }
        store.put({ revision: expectedRevision + 1, data } satisfies Stored, 'main')
      }
      transaction.oncomplete = () => resolve(expectedRevision + 1)
      transaction.onerror = () => reject(new Error('Saving failed. Download a backup to retain your current work.'))
      transaction.onabort = () => reject(new Error(conflict
        ? 'Another MineSafe XR window saved changes. Download your current backup, then reload this window.'
        : 'Saving was interrupted. Download a backup before closing the app.'))
    })
  }
  close() { this.db?.close() }
}

export function migrateEarlierWorkspace(input: TrainingData, text?: string | null): TrainingData {
  const data = copy(input)
  try {
    const saved: unknown = JSON.parse(text ?? localStorage.getItem('minesafe.workspace.v1') ?? 'null')
    if (!saved || typeof saved !== 'object') return data
    const row = saved as { session?: unknown; recent?: unknown[] }
    const previous = [row.session, ...(Array.isArray(row.recent) ? row.recent : [])].filter(isSession)
    const names = new Map<string, string>()
    const seen = new Set<string>()
    for (const old of previous) {
      if (seen.has(old.id)) continue
      seen.add(old.id)
      const name = old.config.trainee.trim() || 'Unnamed trainee'
      let traineeId = names.get(name)
      if (!traineeId) {
        traineeId = 'earlier-trainee-' + names.size; names.set(name, traineeId)
        data.trainees.push({ id: traineeId, name, employeeNumber: '', department: '', role: '', notes: '',
          active: true, createdAt: old.createdAt, updatedAt: old.createdAt })
      }
      if (!old.events.length) continue
      const source = data.scenarios.find(s => s.hazard === old.scenario)!
      const session = newTraining({ ...source, area: old.config.area }, [{ id: traineeId, name, employeeNumber: '', department: '' }], 'Earlier instructor record', false, old.createdAt)
      const duration = Math.max(old.elapsedMs, ...old.events.map(e => e.elapsedMs), 0)
      const converted: TrainingSession = { ...session, id: old.id, status: old.status === 'complete' ? 'complete' : 'paused',
        phase: old.phase, elapsedMs: duration, startedAt: old.createdAt, resumedAt: null,
        endedAt: old.status === 'complete' ? old.createdAt + duration : null, outcome: 'Earlier drill',
        observations: old.observations, earlierRecord: old,
        events: old.events.map(event => ({ id: event.id, atMs: event.elapsedMs, phase: event.phase,
          kind: event.kind === 'phase' ? 'phase' as const : event.kind === 'observation' ? 'observation' as const : 'control' as const,
          title: event.title, detail: event.detail, actor: 'Earlier instructor record', success: null })).sort((a, b) => a.atMs - b.atMs),
      }
      data.sessions.push(converted)
      if (!data.activeSessionId) data.activeSessionId = converted.id
    }
    return validateData(data)
  } catch { return input }
}
