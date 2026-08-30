'use client'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  LAUNCH AUDIO — soundtrack engine for the launch experience
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Expected files in /public/audio (ALL optional — the site degrades
 *  gracefully to silence while a file is missing, see public/audio/README.md):
 *
 *    vault-opening.mp3  ~48.5s  THE soundtrack. Track position 0 aligns
 *                        exactly with T-10s (the final-countdown overlay);
 *                        the ceremony starts at 10.0s into the track.
 *                        Landmarks the visuals sync to:
 *                          10.0s  HOLD      the "0" freezes & collapses
 *                          11.3s  BOLTS     12 bolts blow rapid-fire
 *                          12.9s  ROTATE    final half-turn
 *                          14.5s  BREACH    the drop — door shatters
 *                          16.8s  GENESIS   logo + BlockDAG constellation
 *                          19.8s  CHAIN     the blockchain chains itself
 *                          25.2s  TOUR      9 modules, 1.75s each
 *                          41.2s  LIVE      "TESTNET LIVE" + CTA
 *                          46.8s  outro tail
 *    welcome.mp3        ~24s    late-comer welcome edit (compressed pacing)
 *    ambient.mp3        loop    quiet tension bed for the escalation hours
 *
 *  Autoplay policy: browsers only allow playback after a user gesture.
 *  sync() is idempotent and re-applied on every state change; if the
 *  first play() attempt is blocked, a one-time pointer/key listener
 *  retries — always at the correct offset, never from zero.
 */

const SOUND_KEY = 'xv-sound-enabled'

const TRACKS = {
  main: '/audio/vault-opening.mp3',
  welcome: '/audio/welcome.mp3',
  ambient: '/audio/ambient.mp3',
} as const

type TrackId = keyof typeof TRACKS

export interface AudioSyncSpec {
  track: TrackId
  /** wall-clock ms (Date.now()) that corresponds to `atMs` inside the track */
  wallMs: number
  /** position inside the track (ms) that corresponds to `wallMs` */
  atMs: number
  /** give up syncing once the track would run past this point (ms) */
  maxMs?: number
  volume?: number
  loop?: boolean
}

export interface LaunchAudioState {
  enabled: boolean
  blocked: boolean
  playing: boolean
  track: TrackId | null
}

class LaunchAudioManager {
  private els = new Map<TrackId, HTMLAudioElement>()
  private unavailable = new Set<TrackId>()
  private spec: AudioSyncSpec | null = null
  private enabled = true
  private blocked = false
  private listeners = new Set<() => void>()
  private gestureBound = false
  private lastNotify = ''

  constructor() {
    if (typeof window === 'undefined') return
    try {
      const v = localStorage.getItem(SOUND_KEY)
      this.enabled = v === null ? true : v === '1'
    } catch {
      this.enabled = true
    }
    // debug handle — harmless, handy for QA (`__launchAudio.getState()`)
    ;(window as unknown as { __launchAudio?: unknown }).__launchAudio = this
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  getState(): LaunchAudioState {
    const el = this.spec ? this.els.get(this.spec.track) : undefined
    return {
      enabled: this.enabled,
      blocked: this.blocked,
      playing: !!el && !el.paused,
      track: this.spec ? this.spec.track : null,
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(v: boolean): void {
    this.enabled = v
    try {
      localStorage.setItem(SOUND_KEY, v ? '1' : '0')
    } catch {
      /* private mode */
    }
    if (!v) {
      this.stop(0.3)
    } else if (this.spec) {
      this.apply(this.spec, true)
    }
    this.notify(true)
  }

  toggle(): void {
    this.setEnabled(!this.enabled)
  }

  /**
   * Idempotent — call as often as you like with the current desired spec.
   * Passing null fades out whatever is playing.
   */
  sync(spec: AudioSyncSpec | null): void {
    if (!spec) {
      this.stop(1.2)
      return
    }
    if (this.unavailable.has(spec.track)) return
    this.spec = spec
    if (this.enabled) this.apply(spec, false)
  }

  /** Retry after a user gesture (autoplay policy). */
  retry(): void {
    if (this.enabled && this.spec && !this.unavailable.has(this.spec.track)) {
      this.apply(this.spec, true)
    }
  }

  stop(fadeSec = 1): void {
    const el = this.spec ? this.els.get(this.spec.track) : undefined
    this.spec = null
    this.blocked = false
    if (el && !el.paused) this.fadeOut(el, fadeSec)
    this.notify(true)
  }

  // ── internals ────────────────────────────────────────────────────

  private el(track: TrackId): HTMLAudioElement {
    let el = this.els.get(track)
    if (!el) {
      el = new Audio(TRACKS[track])
      el.preload = 'auto'
      el.volume = track === 'ambient' ? 0.18 : 0.85
      // a missing file must never break the experience
      el.addEventListener('error', () => {
        this.unavailable.add(track)
        if (this.spec && this.spec.track === track) {
          this.spec = null
          this.blocked = false
          this.notify(true)
        }
      })
      // if currentTime was set before metadata loaded, re-seek once ready
      el.addEventListener('loadedmetadata', () => {
        const spec = this.spec
        if (spec && spec.track === track && !spec.loop) {
          const off = (Date.now() - spec.wallMs + spec.atMs) / 1000
          const max = (spec.maxMs ?? 70_000) / 1000
          if (off >= -0.6 && off <= max) {
            try {
              el!.currentTime = Math.max(0, off)
            } catch {
              /* ignore */
            }
          }
        }
      })
      this.els.set(track, el)
    }
    return el
  }

  private apply(spec: AudioSyncSpec, force: boolean): void {
    const el = this.el(spec.track)
    el.loop = !!spec.loop
    if (typeof spec.volume === 'number') el.volume = spec.volume

    // anything else still playing? cross-fade it out
    this.els.forEach((other, id) => {
      if (id !== spec.track && !other.paused) this.fadeOut(other, 0.8)
    })

    const offset = (Date.now() - spec.wallMs + spec.atMs) / 1000
    const max = (spec.maxMs ?? 70_000) / 1000
    if (!spec.loop && (offset < -0.6 || offset > max)) {
      this.stop(0.3)
      return
    }

    if (!spec.loop) {
      const clamped = Math.max(0, offset)
      if (force || Math.abs(el.currentTime - clamped) > 1.4) {
        try {
          el.currentTime = clamped
        } catch {
          /* ignore */
        }
      }
    }

    if (el.paused && (force || !this.blocked)) {
      el.play()
        .then(() => {
          this.blocked = false
          this.notify(true)
        })
        .catch(() => {
          // autoplay blocked — wait for the first user gesture
          this.blocked = true
          this.bindGesture()
          this.notify(true)
        })
    }
    this.notify(false)
  }

  private bindGesture(): void {
    if (this.gestureBound) return
    this.gestureBound = true
    const handler = () => {
      if (this.blocked) this.retry()
    }
    window.addEventListener('pointerdown', handler, { capture: true })
    window.addEventListener('keydown', handler, { capture: true })
  }

  private fadeOut(el: HTMLAudioElement, sec: number): void {
    const start = el.volume
    const t0 = performance.now()
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000))
      el.volume = Math.max(0, start * (1 - k))
      if (k < 1 && !el.paused) {
        requestAnimationFrame(step)
      } else {
        el.pause()
        el.volume = start
      }
    }
    requestAnimationFrame(step)
  }

  private notify(force: boolean): void {
    const s = this.getState()
    const sig = `${s.enabled}|${s.blocked}|${s.playing}|${s.track ?? ''}`
    if (!force && sig === this.lastNotify) return
    this.lastNotify = sig
    this.listeners.forEach((cb) => cb())
  }
}

export const launchAudio = new LaunchAudioManager()
