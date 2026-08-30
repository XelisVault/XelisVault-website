'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { LAUNCH_DATE, useCountdownState } from '@/lib/countdown'
import { launchAudio } from '@/lib/launch-audio'

/**
 * Soundtrack wiring for the launch experience.
 *
 *  final countdown  → main track, position 0 (anchored to the true T-10s
 *                     clock when real, to mount-time in preview/replay)
 *  ceremony         → same track, continuing at 10.0s (ceremony start)
 *  welcome          → welcome track from 0
 *  escalation hours → quiet ambient loop, volume follows intensity
 *  nothing active   → fade to silence
 */

/** track position 0 == T-10s (the final-countdown overlay) */
const MAIN_LEAD_MS = 10_000

export function useLaunchAudio() {
  const [state, setState] = useState(() => launchAudio.getState())
  useEffect(() => {
    const update = () => setState(launchAudio.getState())
    update()
    return launchAudio.subscribe(update)
  }, [])
  return state
}

export function SoundToggle() {
  const { enabled } = useLaunchAudio()
  return (
    <button
      onClick={() => launchAudio.toggle()}
      aria-label={enabled ? 'Mute soundtrack' : 'Enable soundtrack'}
      title={enabled ? 'Soundtrack on' : 'Soundtrack off'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
        enabled
          ? 'border-vault/40 bg-vault/10 text-vault hover:bg-vault/20'
          : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80'
      }`}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  )
}

/**
 * Autoplay policies block audio until a gesture — when the moment of the
 * launch arrives and the browser refuses to play, this chip offers the
 * one click that starts the soundtrack AT THE RIGHT OFFSET.
 */
function SoundGateChip() {
  const { enabled, blocked, track } = useLaunchAudio()
  const show = enabled && blocked && !!track
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35 }}
          onClick={() => launchAudio.retry()}
          className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 inline-flex h-10 items-center gap-2 rounded-full border border-vault/50 bg-background/80 backdrop-blur-md px-5 text-[13px] font-medium text-foreground shadow-[0_0_32px_-8px_var(--vault)] hover:border-vault hover:bg-vault/10 transition-colors"
        >
          <Volume2 className="w-4 h-4 text-vault" />
          Enable sound
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function LaunchAudio({ ceremony, welcome }: { ceremony: boolean; welcome: boolean }) {
  const { isLaunched, isFinalCountdown, intensity } = useCountdownState()
  const segRef = useRef<{ key: string; wall: number }>({ key: 'none', wall: 0 })

  useEffect(() => {
    let key: string
    if (isFinalCountdown) key = 'final'
    else if (ceremony) key = 'ceremony'
    else if (welcome) key = 'welcome'
    else if (!isLaunched && intensity >= 0.25) key = 'ambient'
    else key = 'none'

    const prevKey = segRef.current.key
    if (prevKey !== key) segRef.current = { key, wall: Date.now() }
    const mountWall = segRef.current.wall

    // When we are inside the REAL final window (or riding it into the
    // ceremony), the track is anchored to the true launch clock so it
    // stays frame-accurate no matter when the effect fires.
    const realAnchorWall = LAUNCH_DATE - MAIN_LEAD_MS
    const realOffset = Date.now() - realAnchorWall

    if (key === 'final') {
      launchAudio.sync(
        realOffset >= -1500 && realOffset <= 11_000
          ? { track: 'main', wallMs: realAnchorWall, atMs: 0 }
          : { track: 'main', wallMs: mountWall, atMs: 0 }
      )
    } else if (key === 'ceremony') {
      launchAudio.sync(
        realOffset >= 9_000 && realOffset <= 55_000
          ? { track: 'main', wallMs: realAnchorWall, atMs: 0 }
          : // replay / preview — ceremony starts 10s into the track
            { track: 'main', wallMs: mountWall, atMs: MAIN_LEAD_MS }
      )
    } else if (key === 'welcome') {
      launchAudio.sync({ track: 'welcome', wallMs: mountWall, atMs: 0, maxMs: 40_000 })
    } else if (key === 'ambient') {
      launchAudio.sync({
        track: 'ambient',
        wallMs: mountWall,
        atMs: 0,
        loop: true,
        volume: 0.08 + 0.18 * intensity,
      })
    } else if (
      prevKey === 'ceremony' ||
      prevKey === 'final' ||
      (prevKey === 'none' && launchAudio.getState().track === 'main')
    ) {
      // The ceremony is over but the track is still rolling — let the
      // soundtrack play through to its natural end over the live site.
      launchAudio.sync({ track: 'main', wallMs: mountWall, atMs: 0, maxMs: 150_000 })
    } else {
      launchAudio.sync(null)
    }
  }, [isFinalCountdown, ceremony, welcome, isLaunched, intensity])

  return <SoundGateChip />
}
