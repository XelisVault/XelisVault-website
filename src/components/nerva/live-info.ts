'use client'

/**
 * useLiveInfo — shared NERVA network telemetry.
 *
 * Polls `get_info` every ~12s with jitter (polite: the official explorer
 * front-end polls every 5s per visitor). A module-level singleton keeps
 * every mounted strip/explorer/hero in sync with a single request loop.
 */

import { useEffect, useState } from 'react'
import { getInfo, type NervaInfo } from '@/lib/nerva/api'

let snapshot: NervaInfo | null = null
let listeners = new Set<(info: NervaInfo | null) => void>()
let timer: ReturnType<typeof setInterval> | null = null
let inflight = false

async function tick() {
  if (inflight) return
  inflight = true
  try {
    const info = await getInfo()
    snapshot = info
    for (const l of listeners) l(info)
  } catch {
    /* network hiccup — keep last snapshot */
  } finally {
    inflight = false
  }
}

function ensureLoop() {
  if (timer || typeof window === 'undefined') return
  void tick()
  const jitter = 11_000 + Math.random() * 3_000
  timer = setInterval(tick, jitter)
}

function stopLoopIfIdle() {
  if (listeners.size === 0 && timer) {
    clearInterval(timer)
    timer = null
  }
}

export function useLiveInfo(pollMs?: number) {
  const [info, setInfo] = useState<NervaInfo | null>(() => snapshot)

  useEffect(() => {
    const listener = (i: NervaInfo | null) => setInfo(i)
    listeners.add(listener)
    ensureLoop()
    return () => {
      listeners.delete(listener)
      stopLoopIfIdle()
    }
  }, [])

  // optional faster cadence for pages that need it (explorer)
  useEffect(() => {
    if (!pollMs) return
    const id = setInterval(tick, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  return { info, refresh: tick }
}
