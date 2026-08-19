'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowLeft, Shield, Megaphone, Gem, Code2, Heart, Star,
  Trophy, Sparkles, Crown, Medal, Award,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

/**
 * Hall of Fame — Contributors Page
 *
 * This page is intentionally NOT linked in the main navigation.
 * It's reachable via the footer "Hall of Fame" link only.
 *
 * To add contributors, edit the CATEGORIES array below.
 * Each contributor has: name, handle, contribution, tier (gold/silver/bronze)
 */

interface Contributor {
  name: string
  handle?: string
  contribution: string
  tier?: 'gold' | 'silver' | 'bronze'
}

interface Category {
  id: string
  name: string
  icon: any
  color: string
  tagline: string
  description: string
  contributors: Contributor[]
}

const CATEGORIES: Category[] = [
  {
    id: 'security',
    name: 'Security Researchers',
    icon: Shield,
    color: 'red',
    tagline: 'They found what others missed',
    description:
      'These individuals identified vulnerabilities in the XELIS Vault contracts before they could be exploited. ' +
      'Their work directly prevented loss of funds. Every bug they found made the protocol stronger.',
    contributors: [
      // Placeholder — replace with real data when received
      // { name: '...', handle: '@...', contribution: 'Found critical oracle entry ID bug', tier: 'gold' },
    ],
  },
  {
    id: 'community',
    name: 'Community Builders',
    icon: Megaphone,
    color: 'vault',
    tagline: 'They spread the word',
    description:
      'These people amplify XELIS Vault across social media, organize community events, create educational content, ' +
      'and help newcomers on Discord. They are the human face of the protocol.',
    contributors: [
      // Placeholder
    ],
  },
  {
    id: 'supporters',
    name: 'Supporters',
    icon: Gem,
    color: 'vlt',
    tagline: 'They put their XEL where their heart is',
    description:
      'These individuals sent XEL to the admin wallet to support development. Their contributions funded infrastructure, ' +
      'audit costs, and community initiatives. Every XEL received is publicly acknowledged here.',
    contributors: [
      {
        name: 'BRG',
        handle: '@BRGBRGBRGBRG',
        contribution: 'Sent 100 XEL to support development',
        tier: 'silver',
        avatar: '/images/contributors/supporter-brg.jpg',
        profileUrl: 'https://x.com/BRGBRGBRGBRG',
      },
    ],
  },
  {
    id: 'builders',
    name: 'Builders & Contributors',
    icon: Code2,
    color: 'xusd',
    tagline: 'They wrote the code',
    description:
      'These developers contributed pull requests, wrote documentation, translated content, or built tools ' +
      'on top of the protocol. The MIT-licensed codebase exists thanks to them.',
    contributors: [
      // Placeholder
    ],
  },
]

const TIER_STYLES: Record<string, { icon: any; text: string; bg: string; border: string; label: string }> = {
  gold: { icon: Crown, text: 'text-amber-300', bg: 'bg-amber-500/5', border: 'border-amber-500/30', label: 'Gold' },
  silver: { icon: Medal, text: 'text-slate-300', bg: 'bg-slate-500/5', border: 'border-slate-500/30', label: 'Silver' },
  bronze: { icon: Award, text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/30', label: 'Bronze' },
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot: string; glow: string }> = {
  red: { text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/30', dot: 'bg-red-400', glow: 'shadow-[0_0_40px_-12px_oklch(0.65_0.24_25)]' },
  vault: { text: 'text-vault', bg: 'bg-vault/5', border: 'border-vault/30', dot: 'bg-vault', glow: 'shadow-[0_0_40px_-12px_var(--vault)]' },
  vlt: { text: 'text-vlt', bg: 'bg-vlt/5', border: 'border-vlt/30', dot: 'bg-vlt', glow: 'shadow-[0_0_40px_-12px_var(--vlt)]' },
  xusd: { text: 'text-xusd', bg: 'bg-xusd/5', border: 'border-xusd/30', dot: 'bg-xusd', glow: 'shadow-[0_0_40px_-12px_var(--xusd)]' },
}

export function ContributorsPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-24 md:pt-32">
        {/* Background */}
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-vlt/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-xusd/8 blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          {/* Hero */}
          <motion.div style={{ y: heroY }} className="text-center mb-16">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
              className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-vault/15 border border-vault/40 flex items-center justify-center mb-8 shadow-[0_0_60px_-10px_var(--vault)]"
            >
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-vault" />
            </motion.div>

            <Reveal>
              <SectionLabel>Hall of Fame</SectionLabel>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
                <span className="text-gradient-vault">Thank you,</span>
                <br />
                <span className="text-muted-foreground">builders of the vault.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                XELIS Vault is built by the community, for the community. This page honors the
                individuals who found vulnerabilities, spread the word, supported development, or
                wrote the code. Every name here made the protocol stronger.
              </p>
            </Reveal>
          </motion.div>

          {/* Stats summary */}
          <Reveal delay={0.3}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl glass-panel overflow-hidden mb-16">
              {[
                { label: 'Categories', value: '4', icon: Star },
                { label: 'Security bugs found', value: '—', icon: Shield },
                { label: 'XEL donated', value: '—', icon: Gem },
                { label: 'Contributors', value: '—', icon: Heart },
              ].map((s, i) => (
                <div key={i} className="p-5 md:p-6 bg-card/30 text-center">
                  <s.icon className="w-5 h-5 text-vault mx-auto mb-2" />
                  <div className="font-display text-2xl md:text-3xl font-semibold text-gradient-vault">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Categories */}
          {CATEGORIES.map((cat, catIdx) => {
            const c = COLOR_MAP[cat.color]
            const Icon = cat.icon
            return (
              <section key={cat.id} className={catIdx > 0 ? 'mt-20' : ''}>
                {/* Category header */}
                <Reveal>
                  <div className={`rounded-2xl ${c.bg} border ${c.border} p-6 md:p-8 mb-8`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-6 h-6 ${c.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`text-xs font-mono uppercase tracking-[0.2em] ${c.text}`}>
                          {cat.tagline}
                        </div>
                        <h2 className="mt-1 font-display text-2xl md:text-3xl font-semibold tracking-tight">
                          {cat.name}
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Contributor cards */}
                {cat.contributors.length > 0 ? (
                  <RevealStagger className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {cat.contributors.map((contributor, i) => {
                      const tier = contributor.tier ? TIER_STYLES[contributor.tier] : null
                      const TierIcon = tier?.icon
                      return (
                        <RevealItem key={`${cat.id}-${i}`}>
                          <motion.div
                            whileHover={{ y: -4 }}
                            className={`relative rounded-2xl glass-panel p-5 h-full ${tier ? tier.border : 'border-border'} ${tier ? tier.bg : ''}`}
                          >
                            {/* Tier badge */}
                            {tier && TierIcon && (
                              <div className={`absolute top-3 right-3 w-7 h-7 rounded-full ${tier.bg} border ${tier.border} flex items-center justify-center`}>
                                <TierIcon className={`w-3.5 h-3.5 ${tier.text}`} />
                              </div>
                            )}

                            {/* Avatar placeholder (first letter) */}
                            <div className={`w-10 h-10 rounded-full ${c.bg} border ${c.border} flex items-center justify-center ${c.text} font-display font-bold text-sm mb-3`}>
                              {contributor.name.charAt(0).toUpperCase()}
                            </div>

                            <h3 className="font-display text-base font-semibold leading-tight">
                              {contributor.name}
                            </h3>
                            {contributor.handle && (
                              <div className="mt-0.5 text-xs font-mono text-muted-foreground">
                                {contributor.handle}
                              </div>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                              {contributor.contribution}
                            </p>

                            {tier && (
                              <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider ${tier.text}`}>
                                <TierIcon className="w-3 h-3" />
                                {tier.label}
                              </div>
                            )}
                          </motion.div>
                        </RevealItem>
                      )
                    })}
                  </RevealStagger>
                ) : (
                  <Reveal>
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Contributors will be listed here soon.
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        If you contributed to this category, reach out on Discord to be added.
                      </p>
                    </div>
                  </Reveal>
                )}
              </section>
            )
          })}

          {/* Closing message */}
          <Reveal>
            <div className="mt-20 rounded-2xl border border-vault/30 bg-vault/5 p-8 md:p-12 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-vault/15 border border-vault/40 flex items-center justify-center mx-auto mb-4"
              >
                <Heart className="w-6 h-6 text-vault" />
              </motion.div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                Every contribution matters.
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Whether you found a critical bug, shared a post, sent 1 XEL, or wrote 10 lines of code —
                you are part of the XELIS Vault story. This page grows with every act of contribution.
                Thank you for believing in privacy.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground/60">
                <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
                Built on XELIS BlockDAG · MIT licensed · Community-owned
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
