import { useCallback, useEffect, useRef, useState } from 'react'
import type { TrainingData } from './types'
import { WorkspaceRepository } from './repository'
import { pausedData } from './validation'

export function useWorkspace() {
  const [data, setData] = useState<TrainingData | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pulse, setPulse] = useState(0)
  const repository = useRef<WorkspaceRepository | null>(null)
  const revision = useRef(0)
  const pending = useRef<TrainingData | null>(null)
  const writing = useRef(false)
  const stopped = useRef(false)
  const skipInitialSave = useRef(false)
  const current = useRef(data)
  current.current = data

  useEffect(() => {
    let cancelled = false
    const repo = new WorkspaceRepository()
    void repo.open().then(() => repo.load()).then(saved => {
      if (cancelled) { repo.close(); return }
      repository.current = repo; revision.current = saved.revision
      skipInitialSave.current = saved.revision > 0
      setData(saved.data)
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'The workspace could not be opened.') })
    return () => { cancelled = true; if (repository.current === repo) repository.current = null; repo.close() }
  }, [])

  const flush = useCallback(async () => {
    if (writing.current || stopped.current || !repository.current) return
    writing.current = true; setSaving(true)
    try {
      while (pending.current && repository.current) {
        const next = pending.current; pending.current = null
        revision.current = await repository.current.save(next, revision.current)
      }
    } catch (reason) {
      stopped.current = true
      setError(reason instanceof Error ? reason.message : 'Saving failed. Download a backup before closing.')
    } finally { writing.current = false; setSaving(false) }
  }, [])

  useEffect(() => {
    if (!data) return
    if (skipInitialSave.current) { skipInitialSave.current = false; return }
    pending.current = pausedData(data)
    void flush()
  }, [data, pulse, flush])

  const activeRunning = data?.sessions.some(session => session.id === data.activeSessionId && session.status === 'running')
  useEffect(() => {
    if (!activeRunning) return
    const timer = window.setInterval(() => setPulse(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [activeRunning])

  const update = useCallback((change: (data: TrainingData) => TrainingData) => {
    setData(previous => previous ? change(previous) : previous)
  }, [])
  const retry = useCallback(() => {
    if (!current.current || !repository.current) return
    stopped.current = false; setError(''); pending.current = pausedData(current.current); void flush()
  }, [flush])
  return { data, update, error, saving, retry }
}
