'use client'

/**
 * ANTUMBRA teaser — the third door of XelisVault.
 *
 * A hype page for the network we are specification-first building:
 * the trust layer of the human-machine economy. Everything here is
 * deliberately forward-looking and honest: the whitepaper is the
 * contract, this page is the invitation.
 *
 * Visual language: the annular eclipse of the logo. A dark core kept
 * by construction, a ring of light anyone can switch on. Gold ring on
 * the deep navy of the gate, in the continuity of the Choose Your Side
 * theatre.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useState } from 'react'

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const

/* ── the annular eclipse, CSS only ─────────────────────────── */
function EclipseSigil({ size = 168 }: { size?: number }) {
  const reduce = useReducedMotion()
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label="ANTUMBRA: a dark core surrounded by a ring of light"
    >
      {/* outer glow */}
      <div
        className="absolute -inset-8 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, oklch(0.82 0.1 88 / 0.34), transparent 70%)' }}
      />
      {/* the ring of light */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `${Math.max(4, size * 0.045)}px solid oklch(0.85 0.11 88 / 0.92)`,
          boxShadow:
            '0 0 26px oklch(0.85 0.1 88 / 0.45), inset 0 0 26px oklch(0.85 0.1 88 / 0.28)',
        }}
      />
      {/* the dark core */}
      <div
        className="absolute rounded-full bg-[oklch(0.06_0.012_270)]"
        style={{ inset: size * 0.13, boxShadow: 'inset 0 0 30px oklch(0.03 0.01 270)' }}
      />
      {/* orbiting spark: verification travelling the ring */}
      {!reduce && (
        <div
          className="absolute inset-0"
          style={{ animation: 'antumbra-spin 9s linear infinite' }}
          aria-hidden="true"
        >
          <span
            className="absolute left-1/2 -translate-x-1/2 -top-[3px] w-[6px] h-[6px] rounded-full"
            style={{
              background: 'oklch(0.93 0.08 92)',
              boxShadow: '0 0 12px oklch(0.9 0.1 90 / 0.9)',
            }}
          />
        </div>
      )}
    </div>
  )
}

/* ── reveal helper ─────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── data ──────────────────────────────────────────────────── */
const STATS = [
  { k: '2 s', label: 'blocks' },
  { k: '< 6 s', label: 'finality' },
  { k: '16 180 339', label: 'ATU hard cap' },
  { k: '136 yrs', label: 'emission' },
  { k: '0 %', label: 'premine' },
] as const

const PILLARS = [
  {
    name: 'Kléos',
    tag: 'reputation',
    text: 'A three-layer consensus score: deeds, peer attestations, and time. Non-transferable, corroded by absence, crushed by cheating. The one resource money cannot fabricate, because it takes years to build.',
  },
  {
    name: 'Braise',
    tag: 'human identity',
    text: 'One person, one voice, no biometrics. Presence, capped sponsorship and seniority instead of iris scans. Nothing about your body is ever collected, anywhere, by anyone.',
  },
  {
    name: 'Cipher',
    tag: 'AI agents',
    text: 'Agents that pay on your behalf, by construction accountable: a human sponsor who answers for them, a declarative spending perimeter, a revocation switch that freezes them in one transaction.',
  },
  {
    name: 'Lumen',
    tag: 'disclosure',
    text: 'Private by default, provable on demand. Three levels of view keys let you show one payment, one ledger, or one compliance fact, without ever exposing anyone else.',
  },
  {
    name: "l'Anneau",
    tag: 'finality',
    text: 'Fifty-five seats drawn by reputation sign a checkpoint every four seconds. Payments become irreversible in under six seconds, with zero capital locked: this is not proof of stake.',
  },
] as const

const ROADMAP = [
  { phase: '01', when: 'now', what: 'Specification, whitepaper v1.0, architecture decisions, social-core simulation green' },
  { phase: '02', when: 'M3–M5', what: 'CPU BlockDAG prototype on devnet, Dandelion++ propagation, 24 h without unexpected reorgs' },
  { phase: '03', when: 'M6–M8', what: 'The Ring and Kléos v0: signed checkpoints, sub-6 s finality over 100 000 replayed blocks' },
  { phase: '04', when: 'M9–M12', what: 'Braise and Cipher identities, Lumen view keys, external audit of the diff' },
  { phase: '05', when: 'M13–M15', what: 'Public testnet: faucet, explorer, 100 nodes, three consecutive no-incident upgrades' },
  { phase: '06', when: 'M16–M18', what: 'Genesis: public ceremony, signed binaries for five platforms, Lumen documentation for authorities' },
] as const

/* emission of the first 8 eclipses, in ATU (from the whitepaper table) */
const EMISSION = [
  6180340, 3819660, 2360679, 1458980, 901699, 557280, 344554, 212862,
] as const
const EMISSION_MAX = EMISSION[0]

/* ── the page ──────────────────────────────────────────────── */
export function AntumbraTeaser() {
  const [downloading, setDownloading] = useState(false)

  const onDownload = useCallback(() => {
    setDownloading(true)
    window.setTimeout(() => setDownloading(false), 2400)
  }, [])

  return (
    <main className="relative min-h-screen bg-[oklch(0.045_0.015_270)] text-white/90 overflow-x-hidden">
      {/* ambient background: two faint world glows + starfield dots */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 18% 12%, oklch(0.72 0.09 75 / 0.13), transparent 65%),' +
            'radial-gradient(ellipse 55% 50% at 82% 80%, oklch(0.62 0.08 306 / 0.12), transparent 60%),' +
            'radial-gradient(ellipse 40% 35% at 60% 30%, oklch(0.78 0.06 237 / 0.07), transparent 65%)',
        }}
        aria-hidden="true"
      />

      {/* ═══ hero ═══ */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
          className="flex justify-center"
        >
          <EclipseSigil size={170} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="mt-8 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.5em] text-[oklch(0.78_0.06_237)]"
        >
          XelisVault · third protocol · specification phase
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: EASE_OUT }}
          className="mt-4 font-mono font-bold tracking-[0.3em] text-[34px] sm:text-[52px] leading-none text-white"
        >
          ANTUMBRA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.9 }}
          className="mt-5 text-[15px] sm:text-[17px] text-white/70 max-w-2xl mx-auto leading-relaxed"
        >
          The trust layer of the human-machine economy. Private payments
          finalized in seconds, humans without biometrics, AI agents
          accountable by construction, and a reputation that money cannot
          buy, because it is made of time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.8, ease: EASE_OUT }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/docs/ANTUMBRA-livre-blanc-v1.0.pdf"
            download="ANTUMBRA-livre-blanc-v1.0.pdf"
            onClick={onDownload}
            className="group relative font-mono text-[11px] uppercase tracking-[0.3em] px-7 py-4 border border-[oklch(0.85_0.1_88_/_0.55)] text-[oklch(0.9_0.08_88)] transition-all duration-300 hover:bg-[oklch(0.85_0.1_88_/_0.1)] hover:shadow-[0_0_38px_oklch(0.85_0.1_88_/_0.3)]"
          >
            {downloading ? 'Opening the whitepaper…' : 'Whitepaper · v1.0 (PDF)'}
          </a>
          <a
            href="https://github.com/XelisVault/Antumbra"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.3em] px-7 py-4 border border-white/15 text-white/60 transition-all duration-300 hover:text-white/90 hover:border-white/35"
          >
            GitHub repository
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-5 font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase"
        >
          30 pages · formulas · simulation results · 18-month roadmap · French edition
        </motion.div>
      </section>

      {/* ═══ stats strip ═══ */}
      <section className="relative border-y border-white/8 bg-[oklch(0.07_0.015_270_/_0.7)]">
        <div className="max-w-5xl mx-auto px-6 py-7 grid grid-cols-2 sm:grid-cols-5 gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <div className="font-mono text-[19px] sm:text-[22px] font-bold text-[oklch(0.88_0.09_88)] tabular-nums">
                {s.k}
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ the empty square ═══ */}
      <section className="relative max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
        <Reveal>
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[oklch(0.78_0.06_237)]">
            2026 · four demands, one empty square
          </div>
          <h2 className="mt-5 text-[24px] sm:text-[30px] font-light leading-snug text-white/90">
            Agent commerce has no trust. Personhood has biometric debt.
            Privacy chains are slow or unreadable. Nobody serves the
            square in the middle.
          </h2>
          <p className="mt-7 text-[14.5px] text-white/60 leading-relaxed">
            Millions of agents will pay on behalf of humans through rails
            that say nothing about who is reliable, who vouches for them,
            or how far their budget goes. ANTUMBRA treats that missing
            piece, verifiable trust, as a protocol primitive. The scarce
            resource of the coming economy is not throughput. It is
            confidence, and confidence is the only thing that must be
            built in time, because time cannot be bought.
          </p>
        </Reveal>
      </section>

      {/* ═══ five pillars ═══ */}
      <section className="relative max-w-5xl mx-auto px-6 pb-20 sm:pb-24">
        <Reveal className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[oklch(0.78_0.06_237)]">
            Five primitives, one loop
          </div>
          <h2 className="mt-4 text-[22px] sm:text-[27px] font-light text-white/90">
            The architecture of a shadow, kept by construction
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.07}>
              <div className="h-full rounded-lg border border-white/10 bg-[oklch(0.08_0.015_270_/_0.75)] p-6 transition-colors duration-300 hover:border-[oklch(0.85_0.1_88_/_0.4)]">
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-[15px] font-bold text-white">{p.name}</div>
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[oklch(0.75_0.07_88_/_0.8)]">
                    {p.tag}
                  </div>
                </div>
                <p className="mt-3.5 text-[12.5px] leading-relaxed text-white/55">{p.text}</p>
              </div>
            </Reveal>
          ))}

          {/* the sixth card: the emission of gold */}
          <Reveal delay={0.35}>
            <div className="h-full rounded-lg border border-[oklch(0.85_0.1_88_/_0.3)] bg-[oklch(0.09_0.014_75_/_0.5)] p-6">
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-[15px] font-bold text-white">Éclipses</div>
                <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[oklch(0.8_0.09_88)]">
                  emission
                </div>
              </div>
              <p className="mt-3.5 text-[12.5px] leading-relaxed text-white/55">
                Each 4-year eclipse emits 61.8 % of the previous one, the
                golden section. Exactly 10 000 000 ATU exist after 8 years,
                and the ledger closes on the cap in year 136. The same
                proportion already drives RandomX.
              </p>
              <div className="mt-5 flex items-end gap-1 h-16" aria-hidden="true">
                {EMISSION.map((v, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 2 }}
                    whileInView={{ height: `${Math.max(4, (v / EMISSION_MAX) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.06, duration: 0.7, ease: EASE_OUT }}
                    className="flex-1 rounded-t-[2px]"
                    style={{
                      background:
                        idx === 0
                          ? 'oklch(0.85 0.11 88)'
                          : `oklch(0.72 0.09 237 / ${0.75 - idx * 0.07})`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[8px] text-white/30 tabular-nums">
                <span>e1 · 6 180 340</span>
                <span>× 1/φ each eclipse</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ attacked before coded ═══ */}
      <section className="relative border-t border-white/8 bg-[oklch(0.07_0.015_270_/_0.6)]">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
          <Reveal>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[oklch(0.78_0.06_237)]">
              The specification fought itself
            </div>
            <h2 className="mt-5 text-[21px] sm:text-[26px] font-light leading-snug text-white/90">
              Our own simulation broke our own rules, then the fix held
            </h2>
            <p className="mt-6 text-[14px] text-white/60 leading-relaxed">
              A deterministic simulation of the social core replayed
              sixteen years with a farm of fake profiles and a whale of
              unlimited capital. The first pass captured all 55 finality
              seats at year 10. Four corrective rules closed the window:
              the same maximum attack now takes zero seats, and the whale
              never even becomes a candidate. That simulation ships in
              the repository as the regression test of the social core.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 font-mono">
              {[
                ['55 / 55', 'seats captured, v2 rules'],
                ['0 / 55', 'seats captured, R1–R4'],
                ['11.9 vs 76.5', 'median Kléos, fake vs honest'],
              ].map(([k, v]) => (
                <div key={v} className="rounded border border-white/10 py-4 px-2">
                  <div className="text-[15px] sm:text-[17px] font-bold text-[oklch(0.85_0.09_88)] tabular-nums">{k}</div>
                  <div className="mt-1.5 text-[8px] uppercase tracking-[0.18em] text-white/35 leading-relaxed">{v}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ roadmap ═══ */}
      <section className="relative max-w-3xl mx-auto px-6 py-20 sm:py-24">
        <Reveal className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[oklch(0.78_0.06_237)]">
            Eighteen months, six phases, binary exits
          </div>
          <h2 className="mt-4 text-[22px] sm:text-[27px] font-light text-white/90">
            A NO-GO is an acceptable, published result
          </h2>
        </Reveal>

        <div className="relative pl-8 sm:pl-10 border-l border-white/12 space-y-7">
          {ROADMAP.map((r, i) => (
            <Reveal key={r.phase} delay={i * 0.05}>
              <div className="relative">
                <span
                  className="absolute -left-[37px] sm:-left-[45px] top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: i === 0 ? 'oklch(0.85 0.11 88)' : 'oklch(0.62 0.06 237)',
                    boxShadow: i === 0 ? '0 0 14px oklch(0.85 0.1 88 / 0.8)' : 'none',
                  }}
                />
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-bold text-white/80">{r.phase}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[oklch(0.75_0.07_88)]">{r.when}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">{r.what}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ final CTA ═══ */}
      <section className="relative border-t border-white/8">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <Reveal>
            <div className="flex justify-center">
              <EclipseSigil size={92} />
            </div>
            <h2 className="mt-8 text-[22px] sm:text-[28px] font-light leading-snug text-white/90">
              A shadow faithfully kept, a ring of light anyone can verify
            </h2>
            <p className="mt-5 text-[13.5px] text-white/55 max-w-xl mx-auto leading-relaxed">
              The whitepaper is the full contract: transaction lifecycle
              with its cryptographic constructions, the reputation
              algorithm and its corrected rules, the golden eclipse
              emission, three-tier contracts, the threat register and
              the zero-defect engineering method.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/docs/ANTUMBRA-livre-blanc-v1.0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.3em] px-7 py-4 bg-[oklch(0.85_0.11_88)] text-[oklch(0.13_0.02_75)] font-bold transition-shadow duration-300 hover:shadow-[0_0_44px_oklch(0.85_0.11_88_/_0.45)]"
              >
                Read the whitepaper
              </a>
              <a
                href="/"
                className="font-mono text-[11px] uppercase tracking-[0.3em] px-7 py-4 border border-white/15 text-white/60 hover:text-white/90 hover:border-white/35 transition-all duration-300"
              >
                Back to the vault
              </a>
            </div>
            <div className="mt-10 font-mono text-[8.5px] uppercase tracking-[0.3em] text-white/25">
              ANTUMBRA · a XelisVault project · xelisvault.xyz · September 2026
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
