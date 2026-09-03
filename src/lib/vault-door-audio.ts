// XELIS Vault — vault door ceremony audio engine.
//
// Everything is SYNTHESIZED with the WebAudio API — no asset files, no
// network. The ceremony is triggered right after a user gesture (clicking
// "launch the app"), which satisfies autoplay policies in modern browsers.
// Every public method is a safe no-op if audio is unavailable.

class VaultDoorAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private humNodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null

  private ensure(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AC) return null
        this.ctx = new AC()
        const comp = this.ctx.createDynamicsCompressor()
        comp.threshold.value = -18
        comp.ratio.value = 6
        comp.connect(this.ctx.destination)
        this.master = this.ctx.createGain()
        this.master.gain.value = 0.5
        this.master.connect(comp)
        // 2s of white noise, reused by every percussive sound
        const len = this.ctx.sampleRate * 2
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
        const data = this.noiseBuf.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  private noise(
    gain: number,
    dur: number,
    type: BiquadFilterType,
    freq: number,
    q = 1,
    when = 0,
  ) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuf) return
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.playbackRate.value = 0.9 + Math.random() * 0.2
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    gain: number,
    dur: number,
    when = 0,
  ) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  unlock() {
    this.ensure()
  }

  /** thin mechanical dial tick */
  tick(pitch = 1) {
    if (!this.ensure()) return
    this.noise(0.05, 0.045, 'bandpass', 2600 * pitch, 6)
    this.tone('square', 1900 * pitch, 500 * pitch, 0.028, 0.03)
  }

  /** soft electric "shing" when the mark draws itself */
  shimmer() {
    if (!this.ensure()) return
    this.tone('sine', 620, 1240, 0.05, 0.5)
    this.tone('sine', 930, 1860, 0.03, 0.45, 0.08)
  }

  /** heavy metallic ring-lock */
  clunk(intensity = 1) {
    if (!this.ensure()) return
    this.noise(0.16 * intensity, 0.16, 'bandpass', 340, 2.5)
    this.tone('triangle', 150, 52, 0.22 * intensity, 0.22)
    this.noise(0.08 * intensity, 0.3, 'lowpass', 900, 0.7, 0.06)
    // metallic echo tail
    this.tone('sine', 820, 640, 0.03 * intensity, 0.35, 0.07)
  }

  /** rapid bolt-fire click */
  boltClick() {
    if (!this.ensure()) return
    const p = 0.8 + Math.random() * 0.5
    this.noise(0.06, 0.03, 'bandpass', 3200 * p, 8)
    this.tone('triangle', 240 * p, 90, 0.06, 0.06)
  }

  /** dial spinning whirr */
  whirr(dur = 0.7) {
    const ctx = this.ensure()
    if (!ctx || !this.master || !this.noiseBuf) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(400, t)
    f.frequency.linearRampToValueAtTime(1400, t + dur)
    f.Q.value = 9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3)
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.1)
  }

  /** deep mechanical hum — starts under the unlock phase */
  startHum() {
    const ctx = this.ensure()
    if (!ctx || !this.master || this.humNodes) return
    try {
      const t = ctx.currentTime
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.11, t + 1.1)
      g.connect(this.master)
      const oscs: OscillatorNode[] = []
      for (const [freq, type, gain] of [
        [52, 'sine', 1],
        [104, 'sine', 0.35],
        [156.5, 'triangle', 0.08],
      ] as const) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = freq
        const og = ctx.createGain()
        og.gain.value = gain
        o.connect(og).connect(g)
        o.start(t)
        oscs.push(o)
      }
      this.humNodes = { oscs, gain: g }
    } catch {
      /* ignore */
    }
  }

  stopHum() {
    try {
      if (this.humNodes && this.ctx) {
        const t = this.ctx.currentTime
        this.humNodes.gain.gain.cancelScheduledValues(t)
        this.humNodes.gain.gain.setValueAtTime(
          Math.max(this.humNodes.gain.gain.value, 0.0001),
          t,
        )
        this.humNodes.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        this.humNodes.oscs.forEach((o) => o.stop(t + 0.35))
      }
    } catch {
      /* ignore */
    }
    this.humNodes = null
  }

  /** THE BREACH — sub drop + crack + bloom */
  boom() {
    if (!this.ensure()) return
    const when = 0
    // crack
    this.noise(0.14, 0.08, 'highpass', 2000, 0.8, when)
    // sub drop
    this.tone('sine', 120, 26, 0.6, 1.1, when)
    this.tone('sine', 240, 40, 0.2, 0.9, when)
    // bloom (filtered noise swell)
    this.noise(0.1, 0.8, 'lowpass', 600, 0.7, when + 0.05)
    // echo thump
    this.tone('sine', 70, 30, 0.25, 0.5, when + 0.32)
  }

  /** soft two-note "access granted" chime */
  chime() {
    if (!this.ensure()) return
    this.tone('sine', 660, 658, 0.05, 0.5)
    this.tone('sine', 990, 988, 0.035, 0.7, 0.16)
  }
}

/** singleton — the door ceremony owns it */
export const vaultAudio = new VaultDoorAudio()
