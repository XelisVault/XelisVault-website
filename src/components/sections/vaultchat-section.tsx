'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { VaultChatCinematic } from '@/components/site/vaultchat-cinematic'

export function VaultChatSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section
      ref={ref}
      id="vaultchat"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-vlt/8 blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-xusd/8 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <Reveal>
            <SectionLabel className="text-vlt">
              <span className="text-vlt">End-to-End Encrypted Chat</span>
            </SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              <span className="text-gradient-vault">VaultChat</span>
              <br />
              <span className="text-muted-foreground">Private by design.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              End-to-end encrypted messaging built into XELIS Vault. Nobody can read your
              messages: not relayers, not miners, not the protocol team. Powered by X25519
              Diffie-Hellman key exchange and ChaCha20-Poly1305 encryption, anchored on-chain
              via Merkle roots.
            </p>
          </Reveal>
        </div>

        {/* Cinematic animation */}
        <Reveal delay={0.2}>
          <div className="mb-16">
            <VaultChatCinematic />
          </div>
        </Reveal>

        {/* How a message travels: typographic flow, hairlines only */}
        <Reveal delay={0.2}>
          <div className="pt-10 border-t border-foreground/12 mb-14">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-8">
              How a message travels
            </div>

            <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-8 md:gap-10 items-start">
              <FlowStep
                title="Alice"
                desc="Encrypts the message with Bob's chat public key."
                color="text-vault"
                step="1"
              />
              <FlowArrow label="P2P < 1s" />
              <FlowStep
                title="Relayer"
                desc="Stores the ciphertext, batches it into a Merkle tree."
                color="text-vlt"
                step="2"
              />
              <FlowArrow label="~5s (1 block)" />
              <FlowStep
                title="Bob"
                desc="Decrypts with his chat private key."
                color="text-xusd"
                step="3"
              />
            </div>

            <div className="mt-10 pt-6 border-t border-foreground/10 flex items-center justify-center gap-x-10 gap-y-2 flex-wrap text-xs font-mono">
              <span className="text-vault">Merkle root anchored on-chain every ~80 min</span>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="text-emerald-700">0 gas per message</span>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="text-xusd">ChaCha20-Poly1305</span>
            </div>
          </div>
        </Reveal>

        {/* Key derivation + why relayers charge: editorial split */}
        <div className="grid md:grid-cols-2 gap-x-16 mb-14">
          <Reveal>
            <div className="border-t border-foreground/12 pt-7 md:pt-8">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-4">
                Key Derivation
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                One seed, one keypair
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                VaultChat does not create a second wallet. It derives a chat keypair from
                your existing XELIS wallet private key using HKDF-SHA256. Lose your computer?
                Restore your wallet seed, and the exact same chat keys are regenerated.
                No separate backup needed.
              </p>

              <div className="text-sm">
                <div className="flex items-baseline justify-between py-3 border-b border-foreground/10">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground/70">Input</span>
                  <span className="text-xs font-mono text-vault">XELIS wallet private key</span>
                </div>
                <div className="flex items-baseline justify-between py-3 border-b border-foreground/10">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground/70">Process</span>
                  <span className="text-xs font-mono text-vault">HKDF-SHA256</span>
                </div>
                <div className="flex items-baseline justify-between py-3 border-b border-foreground/10">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground/70">Chat private key</span>
                  <span className="text-xs font-mono text-emerald-700">Local only</span>
                </div>
                <div className="flex items-baseline justify-between py-3 border-b border-foreground/10">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground/70">Chat public key</span>
                  <span className="text-xs font-mono text-vault">On-chain</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Why it can be paid */}
          <Reveal delay={0.1}>
            <div className="border-t border-foreground/12 pt-7 md:pt-8 md:mt-0 mt-10">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-4">
                Why relayers charge
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                Relayers pay gas, so they earn fees
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Every time a relayer stores a message on-chain or anchors a Merkle root,
                it pays network fees in XEL. Without compensation, no one would run a relayer.
                That is why relayers set their own pricing models and earn revenue from users.
              </p>

              <div>
                {[
                  { title: 'Free tier', desc: 'Each relayer can offer a limited number of free daily slots, capping their own gas costs while letting new users try the service.' },
                  { title: 'Per-message pricing', desc: 'Relayers set their own price per message. Users pick whichever relayer offers the best rate.' },
                  { title: 'Subscriptions', desc: 'Duration plans or message packs. Buy for yourself or gift to another wallet.' },
                ].map((p, i) => (
                  <div key={i} className="py-4 border-b border-foreground/10 first:pt-0">
                    <div className="text-sm font-medium text-foreground">{p.title}</div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Relayer reputation: a conduct ledger, no stars */}
        <Reveal delay={0.2}>
          <div className="pt-10 border-t border-foreground/12 mb-14">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-4">
              Relayer Reputation
            </div>
            <div className="grid md:grid-cols-2 gap-x-16">
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Relayers build an on-chain reputation based on their behavior. Users can
                  verify that messages were actually stored on-chain. A relayer that claims
                  to be free but skips on-chain storage to save gas gets rated poorly,
                  blacklisted by peers, and dies off naturally. Honest relayers earn trust
                  and attract more users; relayers also sync messages with each other for
                  redundancy. The protocol takes 5% of all relayer fees for the treasury.
                </p>
              </div>
              <div className="md:mt-0 mt-8">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 pb-3 border-b border-foreground/10">
                  Conduct, as observed on-chain
                </div>
                {[
                  { label: 'Honest, fast, well-priced', outcome: 'Attracts users', color: 'text-emerald-700' },
                  { label: 'Reliable but slower', outcome: 'Retains users', color: 'text-vault' },
                  { label: 'Skips on-chain storage', outcome: 'Rated poorly', color: 'text-amber-700' },
                  { label: 'Blacklisted by peers', outcome: 'Dies off', color: 'text-destructive' },
                ].map((r, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4 py-3.5 border-b border-foreground/10">
                    <span className="text-sm text-foreground">{r.label}</span>
                    <span className={`text-xs font-mono ${r.color}`}>{r.outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Message speed: hairline figures */}
        <Reveal delay={0.2}>
          <div className="mb-14">
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-foreground/10">
              {[
                { label: 'P2P delivery', value: '< 1 sec', sub: 'Both online', color: 'text-emerald-600' },
                { label: 'On-chain storage', value: '~5 sec', sub: '1 block', color: 'text-vault' },
                { label: 'Merkle anchor', value: '~80 min', sub: 'Configurable', color: 'text-vlt' },
                { label: 'Offline recovery', value: 'Next login', sub: 'Auto-sync', color: 'text-xusd' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="py-6 px-5 md:px-6 md:border-l md:first:border-l-0 border-foreground/10"
                >
                  <div className={`font-display text-2xl font-semibold ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs font-medium">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Advanced features: editorial ledger */}
        <Reveal delay={0.2}>
          <div className="grid md:grid-cols-3 gap-x-12 mb-14">
            {[
              {
                title: 'Payment Requests',
                desc: 'Send invoices through chat. The recipient sees the request, clicks Pay, done. On-chain proof for both parties.',
              },
              {
                title: 'Group Giveaways',
                desc: 'Create a giveaway in group chat. The first N people to claim get tokens. Anti-abuse: one claim per wallet.',
              },
              {
                title: 'Direct Messages',
                desc: 'Bypass relayers entirely. The user pays gas for maximum persistence. Separate 50-slot ring buffer for important messages.',
              },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="border-t border-foreground/12 pt-7 h-full">
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Storage: two ledgers side by side */}
        <Reveal delay={0.2}>
          <div className="pt-10 border-t border-foreground/12 mb-14">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-6">
              Storage & Anti-Cheat
            </div>
            <div className="grid md:grid-cols-2 gap-x-16">
              <div>
                <h3 className="font-display text-lg font-semibold mb-4">On-chain</h3>
                <ul className="text-sm text-muted-foreground">
                  {[
                    'Fixed ring buffer: 50 relayed + 50 direct messages per user',
                    'Old messages automatically overwritten, zero blockchain bloat',
                    'Merkle root anchored every ~80 min (configurable)',
                  ].map((li, i) => (
                    <li key={i} className="flex items-baseline gap-4 py-3 border-b border-foreground/8">
                      <span className="font-mono text-xs text-muted-foreground/70 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:mt-0 mt-8">
                <h3 className="font-display text-lg font-semibold mb-4">Off-chain, at the relayer</h3>
                <ul className="text-sm text-muted-foreground">
                  {[
                    'Tiered: Hot (SSD, 7 days), Warm (HDD, 90 days), Cold (Archive)',
                    'Deduplication: the same message from 3 relayers is stored once',
                    'Anti-cheat: users verify storage, bad relayers get blacklisted',
                  ].map((li, i) => (
                    <li key={i} className="flex items-baseline gap-4 py-3 border-b border-foreground/8">
                      <span className="font-mono text-xs text-muted-foreground/70 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* CLI: the real artifact, framed like an exhibit */}
        <Reveal delay={0.2}>
          <div className="pt-10 border-t border-foreground/12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-6">
              Try it now
            </div>
            <div className="relative max-w-2xl">
              <div className="absolute -inset-2.5 rounded-[6px] border border-vault/25 pointer-events-none" />
              <div className="relative rounded-[4px] bg-background/80 ring-1 ring-foreground/15 p-5 font-mono text-xs space-y-2 shadow-maison">
                <div className="text-muted-foreground"># Install xvault</div>
                <div className="text-vault">curl -fsSL https://xelisvault.github.io/xelis-vault/install | bash</div>
                <div className="text-muted-foreground pt-3"># Start chatting</div>
                <div className="text-vault">xvault --chat</div>
                <div className="text-muted-foreground pt-3"># Or run your own relayer</div>
                <div className="text-vault">xvault-relayer</div>
              </div>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Full guide:{' '}
              <a href="https://github.com/XelisVault/xelis-vault/blob/main/docs/CHAT_GUIDE.md" target="_blank" rel="noreferrer" className="text-vault border-b border-vault/40 hover:border-vault transition-colors">
                docs/CHAT_GUIDE.md
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FlowStep({ title, desc, color, step }: { title: string; desc: string; color: string; step: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: parseInt(step) * 0.15 }}
      className="flex flex-col"
    >
      <div className={`font-display text-5xl font-light ${color} opacity-60`}>{step}</div>
      <div className="mt-3 font-display text-lg font-semibold">{title}</div>
      <div className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{desc}</div>
    </motion.div>
  )
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center pt-6">
      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-muted-foreground/40 text-lg">→</motion.div>
      <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">{label}</div>
    </div>
  )
}
