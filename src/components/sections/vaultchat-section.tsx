'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { Lock, Key, Server, Anchor, Zap, Users, MessageSquare, ShieldCheck, Radio, FileLock2, Coins, ArrowRight, Star, TrendingUp } from 'lucide-react'
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

        {/* How it works */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl glass-panel p-6 md:p-10 mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-8">
              How a message travels
            </div>

            <div className="grid md:grid-cols-5 gap-4 md:gap-2 items-center">
              <FlowStep
                icon={MessageSquare}
                title="Alice"
                desc="Encrypts message with Bob's chat public key"
                color="vault"
                step="1"
              />
              <FlowArrow label="P2P < 1s" />
              <FlowStep
                icon={Server}
                title="Relayer"
                desc="Stores ciphertext, batches into Merkle tree"
                color="vlt"
                step="2"
              />
              <FlowArrow label="~5s (1 block)" />
              <FlowStep
                icon={MessageSquare}
                title="Bob"
                desc="Decrypts with his chat private key"
                color="xusd"
                step="3"
              />
            </div>

            <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 rounded-full bg-vault/10 border border-vault/30 px-4 py-2">
                <Anchor className="w-3.5 h-3.5 text-vault" />
                <span className="text-xs font-mono text-vault">Merkle root anchored on-chain every ~80 min</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono text-emerald-300">0 gas per message</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-xusd/10 border border-xusd/30 px-4 py-2">
                <Lock className="w-3.5 h-3.5 text-xusd" />
                <span className="text-xs font-mono text-xusd">ChaCha20-Poly1305</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Key derivation */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Reveal>
            <div className="rounded-2xl glass-panel p-6 md:p-8 h-full">
              <div className="flex items-center gap-2 mb-5">
                <Key className="w-5 h-5 text-vault" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-vault">
                  Key Derivation
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                One seed, one keypair
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                VaultChat does not create a second wallet. It derives a chat keypair from
                your existing XELIS wallet private key using HKDF-SHA256. Lose your computer?
                Restore your wallet seed, and the exact same chat keys are regenerated.
                No separate backup needed.
              </p>

              <div className="space-y-3">
                <div className="rounded-lg bg-card/40 border border-border p-3">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Input</div>
                  <div className="text-xs font-mono mt-1 text-vault">XELIS Wallet Private Key</div>
                </div>
                <div className="flex justify-center">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-vault/60">↓</motion.div>
                </div>
                <div className="rounded-lg bg-vault/5 border border-vault/20 p-3">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Process</div>
                  <div className="text-xs font-mono mt-1 text-vault">HKDF-SHA256</div>
                </div>
                <div className="flex justify-center">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="text-vault/60">↓</motion.div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-card/40 border border-border p-3">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Chat Private Key</div>
                    <div className="text-[10px] font-mono mt-1 text-emerald-400">Local only</div>
                  </div>
                  <div className="rounded-lg bg-card/40 border border-border p-3">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Chat Public Key</div>
                    <div className="text-[10px] font-mono mt-1 text-vault">On-chain</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* WHY it can be paid */}
          <Reveal delay={0.1}>
            <div className="rounded-2xl glass-panel p-6 md:p-8 h-full">
              <div className="flex items-center gap-2 mb-5">
                <Coins className="w-5 h-5 text-vlt" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-vlt">
                  Why relayers charge
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                Relayers pay gas, so they earn fees
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Every time a relayer stores a message on-chain or anchors a Merkle root,
                it pays network fees in XEL. Without compensation, no one would run a relayer.
                That is why relayers set their own pricing models and earn revenue from users.
              </p>

              <div className="space-y-3">
                <div className="rounded-lg bg-card/40 border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-medium">Free Tier</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each relayer can offer a limited number of free daily slots. Caps their
                    own gas costs while letting new users try the service.
                  </p>
                </div>
                <div className="rounded-lg bg-card/40 border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-3.5 h-3.5 text-vlt" />
                    <span className="text-sm font-medium">Per-Message Pricing</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Relayers set their own price per message. Users pick whichever relayer
                    offers the best rate.
                  </p>
                </div>
                <div className="rounded-lg bg-card/40 border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-3.5 h-3.5 text-xusd" />
                    <span className="text-sm font-medium">Subscriptions</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Duration plans or message packs. Buy for yourself or gift to another wallet.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Relayer reputation */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl glass-panel p-6 md:p-8 mb-12">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-vlt" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-vlt">
                Relayer Reputation
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Relayers build an on-chain reputation based on their behavior. Users can
                  verify that messages were actually stored on-chain. A relayer that claims
                  to be free but skips on-chain storage to save gas gets rated poorly.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Good relayers earn trust and attract more users
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Dishonest relayers get blacklisted by peers and die off naturally
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Relayers sync messages with each other for redundancy
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Protocol takes 5% of all relayer fees for treasury
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 justify-center">
                {[
                  { stars: 5, label: 'Honest, fast, well-priced', pct: 85, color: 'bg-emerald-500' },
                  { stars: 4, label: 'Reliable but slower', pct: 60, color: 'bg-vault' },
                  { stars: 2, label: 'Skips on-chain storage', pct: 20, color: 'bg-amber-500' },
                  { stars: 1, label: 'Blacklisted by peers', pct: 5, color: 'bg-red-500' },
                ].map((r, i) => (
                  <div key={i} className="rounded-lg bg-card/40 border border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < r.stars ? 'text-vlt fill-vlt' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{r.label}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-card/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${r.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full ${r.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Message speed */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl glass-panel p-6 md:p-8 mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-6">
              Message Speed
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'P2P delivery', value: '< 1 sec', sub: 'Both online', color: 'emerald' },
                { label: 'On-chain storage', value: '~5 sec', sub: '1 block', color: 'vault' },
                { label: 'Merkle anchor', value: '~80 min', sub: 'Configurable', color: 'vlt' },
                { label: 'Offline recovery', value: 'Next login', sub: 'Auto-sync', color: 'xusd' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl bg-card/40 border border-border p-4 text-center"
                >
                  <div className={`font-display text-2xl font-semibold ${s.color === 'emerald' ? 'text-emerald-400' : s.color === 'vault' ? 'text-vault' : s.color === 'vlt' ? 'text-vlt' : 'text-xusd'}`}>
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs font-medium">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Advanced features */}
        <Reveal delay={0.2}>
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              {
                icon: FileLock2,
                title: 'Payment Requests',
                desc: 'Send invoices through chat. Recipient sees the request, clicks Pay, done. On-chain proof for both parties.',
              },
              {
                icon: Coins,
                title: 'Group Giveaways',
                desc: 'Create a giveaway in group chat. First N people to claim get tokens. Anti-abuse: one claim per wallet.',
              },
              {
                icon: ShieldCheck,
                title: 'Direct Messages',
                desc: 'Bypass relayers entirely. User pays gas for maximum persistence. Separate 50-slot ring buffer for important messages.',
              },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="rounded-2xl glass-panel p-6 h-full">
                  <div className="w-10 h-10 rounded-lg bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt mb-4">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Storage */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl glass-panel p-6 md:p-8 mb-12">
            <div className="flex items-center gap-2 mb-5">
              <Radio className="w-5 h-5 text-vault" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-vault">
                Storage & Anti-Cheat
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display text-lg font-semibold mb-3">On-chain</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vault mt-1.5 shrink-0" />
                    Fixed ring buffer: 50 relayed + 50 direct messages per user
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vault mt-1.5 shrink-0" />
                    Old messages automatically overwritten, zero blockchain bloat
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vault mt-1.5 shrink-0" />
                    Merkle root anchored every ~80 min (configurable)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold mb-3">Off-chain (Relayer)</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Tiered: Hot (SSD, 7d), Warm (HDD, 90d), Cold (Archive)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Deduplication: same message from 3 relayers stored once
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vlt mt-1.5 shrink-0" />
                    Anti-cheat: users verify storage, bad relayers get blacklisted
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* CLI */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl glass-panel p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <TerminalIcon className="w-5 h-5 text-vault" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-vault">
                Try it now
              </span>
            </div>
            <div className="rounded-xl bg-background/60 border border-border p-4 font-mono text-xs space-y-2">
              <div className="text-muted-foreground"># Install xvault</div>
              <div className="text-vault">curl -fsSL https://xelisvault.github.io/xelis-vault/install | bash</div>
              <div className="text-muted-foreground mt-3"># Start chatting</div>
              <div className="text-vault">xvault --chat</div>
              <div className="text-muted-foreground mt-3"># Or run your own relayer</div>
              <div className="text-vault">xvault-relayer</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="w-3 h-3" />
              <span>Full guide: <a href="https://github.com/XelisVault/xelis-vault/blob/main/docs/CHAT_GUIDE.md" target="_blank" rel="noreferrer" className="text-vault hover:underline">docs/CHAT_GUIDE.md</a></span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FlowStep({ icon: Icon, title, desc, color, step }: { icon: typeof Lock; title: string; desc: string; color: string; step: string }) {
  const colors: Record<string, string> = {
    vault: 'text-vault border-vault/30 bg-vault/10',
    xusd: 'text-xusd border-xusd/30 bg-xusd/10',
    vlt: 'text-vlt border-vlt/30 bg-vlt/10',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: parseInt(step) * 0.15 }}
      className="flex flex-col items-center text-center"
    >
      <div className={`w-14 h-14 rounded-2xl border ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed max-w-[140px]">{desc}</div>
    </motion.div>
  )
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center">
      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-muted-foreground/40 text-lg">→</motion.div>
      <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">{label}</div>
    </div>
  )
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}
