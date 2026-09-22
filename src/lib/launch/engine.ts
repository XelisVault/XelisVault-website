// VaultLaunch demo engine — a client-side market simulation.
//
// Everything is deterministic at t0 (SSR-safe); after mount, `start()` runs a
// 2s tick = 1 topoheight at 1× speed. Each topo:
//   • bonding projects receive simulated agent buys/sells (log-distributed)
//   • validating projects receive drip votes (KLEOS reaches quorum in minutes)
//   • deadlines finalize: KLEOS → ACCEPTED → fresh bonding curve
//   • graduation (reserves ≥ 4× seed) → overlay → atomic migration to LaunchDEX
//   • DEX pools receive agent swaps; LP fees accrue to the user pro-rata
//
// The engine never blocks: user actions apply instantly and feed the charts.

'use client'

import { create } from 'zustand'
import type { Project, ActivityItem, BondingPosition, LpPosition } from './types'
import { PROTOCOL } from './types'
import { buildInitialProjects, buildInitialActivity, ACTORS } from './data'
import {
  quoteBuy, quoteSell, quoteDexSwap, quoteDexSwapToXel,
  isGraduated, votePasses,
} from './math'

export type DemoEventKind = 'accepted' | 'graduating' | 'migrated'
export interface DemoEvent {
  kind: DemoEventKind
  projectId: string
  name: string
  ticker: string
  ts: number
}

export interface PendingNav { view: 'dex' | 'trading'; id: string }

interface EngineState {
  started: boolean
  speed: number
  topoheight: number
  projects: Project[]
  activity: ActivityItem[]
  /** Live overlay event (graduation / acceptance celebration). */
  event: DemoEvent | null
  /** Navigation request emitted after a celebration CTA. */
  pendingNav: PendingNav | null

  // Demo wallet
  address: string
  xel: number
  tokens: Record<string, number>
  positions: BondingPosition[]
  lps: LpPosition[]
  votes: Record<string, 'support' | 'report'>

  // Engine control
  start: () => void
  setSpeed: (s: number) => void
  tick: () => void
  clearEvent: () => void
  consumeNav: () => void

  // User actions
  buy: (projectId: string, xelAmount: number) => { ok: boolean; message: string }
  sell: (projectId: string, tokenAmount: number) => { ok: boolean; message: string }
  vote: (projectId: string, side: 'support' | 'report') => { ok: boolean; message: string }
  swapToToken: (poolId: string, xelAmount: number) => { ok: boolean; message: string }
  swapToXel: (poolId: string, tokenAmount: number) => { ok: boolean; message: string }
  addLiquidity: (poolId: string, xelAmount: number) => { ok: boolean; message: string }
  removeLiquidity: (poolId: string, parts: number) => { ok: boolean; message: string }
}

// Non-reactive engine internals (timers, migration queue)
const internal: {
  timer: ReturnType<typeof setInterval> | null
  rnd: () => number
  migrating: Set<string>
} = { timer: null, rnd: Math.random, migrating: new Set() }

const START_TOPO = 4_812_340
const HISTORY_CAP = 150
const ACTIVITY_CAP = 60
const TOTAL_SUPPLY: Record<string, number> = { nova: 96_000, cyph: 120_000, kleos: 100_000 }

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function pickActor(): string {
  return ACTORS[Math.floor(internal.rnd() * ACTORS.length)]
}

/** Log-distributed trade amount between min and max. */
function logAmount(min: number, max: number): number {
  const r = internal.rnd()
  const v = Math.exp(Math.log(min) + r * (Math.log(max) - Math.log(min)))
  return Math.round(v * 100) / 100
}

const initialProjects = buildInitialProjects(START_TOPO, 0)

export const useEngine = create<EngineState>((set, get) => ({
  started: false,
  speed: 1,
  topoheight: START_TOPO,
  projects: initialProjects,
  activity: [],
  event: null,
  pendingNav: null,

  address: 'xel1qdemo…vaultlaunch',
  xel: 250_000,
  tokens: { VLT: 32_000, XPAY: 15_000, NOVA: 6_800 },
  positions: [
    { projectId: 'nova', tokens: 6_800, avgPrice: 0.0612 },
  ],
  lps: [
    { poolId: 'vlt', parts: 18_400, xelProvided: 8_900, feesEarnedXel: 412.6 },
  ],
  votes: {},

  start: () => {
    if (get().started) return
    const now = Date.now()
    // Stamp vote deadlines relative to real clock (client-only from here on)
    set((s) => ({
      started: true,
      activity: buildInitialActivity(now),
      projects: s.projects.map((p) =>
        p.vote ? { ...p, vote: { ...p.vote, deadlineMs: now + (p.vote.deadlineTopo - START_TOPO) * 2000 } } : p
      ),
    }))
    internal.timer = setInterval(() => get().tick(), 2000)
  },

  setSpeed: (speed) => set({ speed }),

  clearEvent: () => set({ event: null }),

  consumeNav: () => set({ pendingNav: null }),

  tick: () => {
    const state = get()
    const speed = state.speed
    let projects = state.projects.map((p) => ({ ...p, curve: p.curve ? { ...p.curve } : undefined, pool: p.pool ? { ...p.pool } : undefined, vote: p.vote ? { ...p.vote } : undefined }))
    let activity = [...state.activity]
    let event = state.event
    let newLpFees = 0

    const pushActivity = (item: Omit<ActivityItem, 'id' | 'ts'>) => {
      activity.unshift({ id: uid(), ts: Date.now(), ...item })
      if (activity.length > ACTIVITY_CAP) activity.length = ACTIVITY_CAP
    }

    for (let step = 0; step < speed; step++) {
      const topo = state.topoheight + step + 1

      // ── 1. Bonding curves: agent trades ──────────────────────
      for (const p of projects) {
        if (p.status !== 'bonding' || !p.curve || internal.migrating.has(p.id)) continue
        // 1 topo ≈ 1-2 trades; agents are net-buyers on a healthy curve
        if (internal.rnd() < 0.62) {
          const isBuy = internal.rnd() < 0.72
          if (isBuy) {
            const amt = logAmount(4, 110)
            const q = quoteBuy(amt, p.curve.reserves, p.curve.circulating, p.curve.feeBps)
            p.curve.reserves += q.net
            p.curve.circulating -= q.out
            p.curve.volume24h += amt
            if (internal.rnd() < 0.18) p.curve.holders += 1
            pushActivity({ kind: 'buy', projectId: p.id, actor: pickActor(), amountXel: amt, tokens: q.out, price: q.priceAfter })
          } else {
            // agents sell at most ~1.2% of outstanding tokens to avoid dumping
            const outstanding = Math.max(0, (TOTAL_SUPPLY[p.id] ?? 0) - p.curve.circulating)
            const maxSell = Math.max(60, outstanding * 0.012)
            const tokens = logAmount(50, maxSell)
            const q = quoteSell(tokens, p.curve.reserves, p.curve.circulating, p.curve.feeBps)
            if (q.out > 0.01) {
              p.curve.reserves -= q.gross
              p.curve.circulating += tokens
              p.curve.volume24h += q.out
              pushActivity({ kind: 'sell', projectId: p.id, actor: pickActor(), amountXel: q.out, tokens, price: q.priceAfter })
            }
          }
        }
        // Graduation check: freeze the curve, run the celebration sequence
        if (isGraduated(p.curve.reserves, p.curve.seed)) {
          internal.migrating.add(p.id)
          event = { kind: 'graduating', projectId: p.id, name: p.name, ticker: p.ticker, ts: Date.now() }
          pushActivity({ kind: 'graduation', projectId: p.id, actor: 'protocol', note: `${p.ticker} crossed ${p.curve.seed * 4} XEL · graduation triggered` })
          setTimeout(() => migrateProject(p.id), 3000)
          setTimeout(() => useEngine.getState().clearEvent(), 9000)
        }
      }

      // ── 2. Validation windows: drip votes + finalize ──────────
      for (const p of projects) {
        if (p.status !== 'validating' || !p.vote) continue
        // KLEOS is hot: the community is voting right now
        const dripChance = p.id === 'kleos' ? 0.10 : 0.03
        if (internal.rnd() < dripChance) {
          const support = internal.rnd() < (p.id === 'kleos' ? 0.85 : 0.6)
          if (support) p.vote.supporters += 1
          else p.vote.reporters += 1
          pushActivity({
            kind: 'vote', projectId: p.id, actor: pickActor(),
            note: `voted ${support ? 'SUPPORT' : 'REPORT'} · ${p.vote.supporters}/${p.vote.supporters + p.vote.reporters} (${Math.round((p.vote.supporters / (p.vote.supporters + p.vote.reporters)) * 100)}%)`,
          })
        }
        // Deadline reached → finalize
        if (topo >= p.vote.deadlineTopo) {
          const voters = p.vote.supporters + p.vote.reporters
          const approval = voters > 0 ? p.vote.supporters / voters : 0
          if (votePasses(voters, approval)) {
            // ACCEPTED → fresh bonding curve goes live
            p.status = 'bonding'
            p.proposedAt = Date.now()
            p.trust = { up: p.vote.supporters, down: p.vote.reporters }
            p.curve = {
              reserves: PROTOCOL.minLiquidity,
              circulating: 25_000,
              seed: PROTOCOL.minLiquidity,
              feeBps: PROTOCOL.tradingFeeBps,
              teamBps: 1_200,
              history: Array.from({ length: 30 }, (_, i) =>
                (PROTOCOL.minLiquidity / 25_000) * (0.985 + Math.sin(i / 5) * 0.01)
              ),
              volume24h: 0,
              holders: 1,
            }
            event = { kind: 'accepted', projectId: p.id, name: p.name, ticker: p.ticker, ts: Date.now() }
            pushActivity({ kind: 'proposal', projectId: p.id, actor: 'community', note: `VALIDATION PASSED · ${voters} voters, ${Math.round(approval * 100)}% approval · ${p.ticker} is LIVE on the bonding curve` })
            setTimeout(() => useEngine.getState().clearEvent(), 7000)
          } else {
            p.status = 'rejected'
            pushActivity({ kind: 'proposal', projectId: p.id, actor: 'community', note: `VALIDATION FAILED · ${voters} voters, ${Math.round(approval * 100)}% · liquidity 100% refunded` })
          }
        }
      }

      // ── 3. LaunchDEX pools: agent swaps + LP fee accrual ──────
      for (const p of projects) {
        if (!p.pool) continue
        if (internal.rnd() < 0.7) {
          const toToken = internal.rnd() < 0.55
          if (toToken) {
            const amt = logAmount(15, 600)
            const q = quoteDexSwap(amt, p.pool, p.pool.feeBps)
            p.pool.xel += q.net
            p.pool.token -= q.out
            p.pool.volume24h += amt
            p.pool.fees24h += q.fee
            newLpFees += q.fee * (1 - p.pool.adminSplitBps / 10_000)
            pushActivity({ kind: 'swap', projectId: p.id, actor: pickActor(), amountXel: amt, tokens: q.out, price: q.priceAfter })
          } else {
            const tokens = logAmount(40, 2_500)
            const q = quoteDexSwapToXel(tokens, p.pool, p.pool.feeBps)
            p.pool.xel -= q.gross
            p.pool.token += tokens
            p.pool.volume24h += q.out
            p.pool.fees24h += q.fee
            newLpFees += q.fee * (1 - p.pool.adminSplitBps / 10_000)
            pushActivity({ kind: 'swap', projectId: p.id, actor: pickActor(), amountXel: q.out, tokens, price: p.pool.xel / p.pool.token })
          }
        }
        // Chart point
        const price = p.pool.xel / p.pool.token
        p.pool.history = [...p.pool.history, price].slice(-HISTORY_CAP)
      }
    }

    // ── 4. Commit tick ─────────────────────────────────────────
    const topoheight = state.topoheight + speed
    set((s) => {
      // Push chart points for bonding projects (once per tick, not per step)
      const projectsWithHistory = projects.map((p) => {
        if (p.curve && p.status === 'bonding' && !internal.migrating.has(p.id)) {
          return { ...p, curve: { ...p.curve, history: [...p.curve.history, p.curve.reserves / p.curve.circulating].slice(-HISTORY_CAP) } }
        }
        return p
      })
      // LP fee accrual to the user (pro-rata of parts)
      const lps = s.lps.map((lp) => {
        const pool = projects.find((p) => p.id === lp.poolId)?.pool
        if (!pool || newLpFees <= 0) return lp
        const share = lp.parts / Math.max(pool.totalParts, 1)
        return { ...lp, feesEarnedXel: lp.feesEarnedXel + newLpFees * share }
      })
      return { projects: projectsWithHistory, activity, event, topoheight, lps }
    })
  },

  // ─── User actions ─────────────────────────────────────────────

  buy: (projectId, xelAmount) => {
    const s = get()
    const p = s.projects.find((x) => x.id === projectId)
    if (!p || !p.curve || p.status !== 'bonding') return { ok: false, message: 'Curve is not live' }
    if (internal.migrating.has(projectId)) return { ok: false, message: 'Migration in progress' }
    if (xelAmount <= 0) return { ok: false, message: 'Enter an amount' }
    if (xelAmount > s.xel) return { ok: false, message: 'Insufficient XEL balance' }
    const q = quoteBuy(xelAmount, p.curve.reserves, p.curve.circulating, p.curve.feeBps)
    if (q.out <= 0) return { ok: false, message: 'Amount too small' }

    const projects = s.projects.map((x) => {
      if (x.id !== projectId) return x
      return {
        ...x,
        curve: x.curve && {
          ...x.curve,
          reserves: x.curve.reserves + q.net,
          circulating: x.curve.circulating - q.out,
          volume24h: x.curve.volume24h + xelAmount,
          history: [...x.curve.history, q.priceAfter].slice(-HISTORY_CAP),
        },
      }
    })

    const positions = [...s.positions]
    const idx = positions.findIndex((pos) => pos.projectId === projectId)
    if (idx >= 0) {
      const pos = positions[idx]
      const total = pos.tokens + q.out
      positions[idx] = { ...pos, tokens: total, avgPrice: (pos.tokens * pos.avgPrice + q.out * q.avgPrice) / total }
    } else {
      positions.push({ projectId, tokens: q.out, avgPrice: q.avgPrice })
    }

    set({
      projects,
      positions,
      xel: s.xel - xelAmount,
      tokens: { ...s.tokens, [p.ticker]: (s.tokens[p.ticker] ?? 0) + q.out },
      activity: [
        { id: uid(), ts: Date.now(), kind: 'buy' as const, projectId, actor: 'you', amountXel: xelAmount, tokens: q.out, price: q.priceAfter },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })

    // Graduation?
    const updated = projects.find((x) => x.id === projectId)
    if (updated?.curve && isGraduated(updated.curve.reserves, updated.curve.seed)) {
      internal.migrating.add(projectId)
      set({
        event: { kind: 'graduating', projectId, name: p.name, ticker: p.ticker, ts: Date.now() },
        activity: [{ id: uid(), ts: Date.now(), kind: 'graduation' as const, projectId, actor: 'protocol', note: `${p.ticker} crossed ${updated.curve.seed * 4} XEL · YOUR BUY graduated the project` }, ...get().activity].slice(0, ACTIVITY_CAP),
      })
      setTimeout(() => migrateProject(projectId), 3000)
      setTimeout(() => useEngine.getState().clearEvent(), 9000)
    }

    return { ok: true, message: `Bought ${q.out.toFixed(2)} ${p.ticker} @ ${q.avgPrice.toFixed(5)} XEL` }
  },

  sell: (projectId, tokenAmount) => {
    const s = get()
    const p = s.projects.find((x) => x.id === projectId)
    if (!p || !p.curve || p.status !== 'bonding') return { ok: false, message: 'Curve is not live' }
    if (internal.migrating.has(projectId)) return { ok: false, message: 'Migration in progress' }
    const owned = s.tokens[p.ticker] ?? 0
    if (tokenAmount <= 0) return { ok: false, message: 'Enter an amount' }
    if (tokenAmount > owned) return { ok: false, message: `Insufficient ${p.ticker} balance` }
    const q = quoteSell(tokenAmount, p.curve.reserves, p.curve.circulating, p.curve.feeBps)
    if (q.out <= 0) return { ok: false, message: 'Amount too small' }

    const projects = s.projects.map((x) => x.id !== projectId ? x : {
      ...x,
      curve: x.curve && {
        ...x.curve,
        reserves: x.curve.reserves - q.gross,
        circulating: x.curve.circulating + tokenAmount,
        volume24h: x.curve.volume24h + q.out,
        history: [...x.curve.history, q.priceAfter].slice(-HISTORY_CAP),
      },
    })

    const positions = s.positions
      .map((pos) => pos.projectId === projectId ? { ...pos, tokens: pos.tokens - tokenAmount } : pos)
      .filter((pos) => pos.tokens > 0.0001)

    set({
      projects,
      positions,
      xel: s.xel + q.out,
      tokens: { ...s.tokens, [p.ticker]: owned - tokenAmount },
      activity: [
        { id: uid(), ts: Date.now(), kind: 'sell' as const, projectId, actor: 'you', amountXel: q.out, tokens: tokenAmount, price: q.priceAfter },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    return { ok: true, message: `Sold ${tokenAmount.toLocaleString()} ${p.ticker} for ${q.out.toFixed(4)} XEL` }
  },

  vote: (projectId, side) => {
    const s = get()
    if (s.votes[projectId]) return { ok: false, message: 'You already voted this round (1 address = 1 vote)' }
    const p = s.projects.find((x) => x.id === projectId)
    if (!p || !p.vote || p.status !== 'validating') return { ok: false, message: 'Vote window closed' }
    const projects = s.projects.map((x) => {
      if (x.id !== projectId || !x.vote) return x
      return {
        ...x,
        vote: {
          ...x.vote,
          supporters: x.vote.supporters + (side === 'support' ? 1 : 0),
          reporters: x.vote.reporters + (side === 'report' ? 1 : 0),
          userVoted: side,
        },
      }
    })
    set({
      projects,
      votes: { ...s.votes, [projectId]: side },
      activity: [
        { id: uid(), ts: Date.now(), kind: 'vote' as const, projectId, actor: 'you', note: `voted ${side.toUpperCase()}` },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    const v = projects.find((x) => x.id === projectId)!.vote!
    return { ok: true, message: `Vote recorded · ${v.supporters}/${v.supporters + v.reporters} voters, ${Math.round((v.supporters / (v.supporters + v.reporters)) * 100)}% approval` }
  },

  swapToToken: (poolId, xelAmount) => {
    const s = get()
    const p = s.projects.find((x) => x.id === poolId)
    if (!p || !p.pool) return { ok: false, message: 'Pool not found' }
    if (xelAmount <= 0) return { ok: false, message: 'Enter an amount' }
    if (xelAmount > s.xel) return { ok: false, message: 'Insufficient XEL balance' }
    const q = quoteDexSwap(xelAmount, p.pool, p.pool.feeBps)
    if (q.out <= 0) return { ok: false, message: 'Amount too small' }
    set({
      xel: s.xel - xelAmount,
      tokens: { ...s.tokens, [p.ticker]: (s.tokens[p.ticker] ?? 0) + q.out },
      projects: s.projects.map((x) => x.id !== poolId ? x : {
        ...x,
        pool: x.pool && {
          ...x.pool,
          xel: x.pool.xel + q.net,
          token: x.pool.token - q.out,
          volume24h: x.pool.volume24h + xelAmount,
          fees24h: x.pool.fees24h + q.fee,
        },
      }),
      activity: [
        { id: uid(), ts: Date.now(), kind: 'swap' as const, projectId: poolId, actor: 'you', amountXel: xelAmount, tokens: q.out, price: q.priceAfter },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    return { ok: true, message: `Swapped ${xelAmount.toLocaleString()} XEL for ${q.out.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${p.ticker}` }
  },

  swapToXel: (poolId, tokenAmount) => {
    const s = get()
    const p = s.projects.find((x) => x.id === poolId)
    if (!p || !p.pool) return { ok: false, message: 'Pool not found' }
    const owned = s.tokens[p.ticker] ?? 0
    if (tokenAmount <= 0) return { ok: false, message: 'Enter an amount' }
    if (tokenAmount > owned) return { ok: false, message: `Insufficient ${p.ticker} balance` }
    const q = quoteDexSwapToXel(tokenAmount, p.pool, p.pool.feeBps)
    if (q.out <= 0) return { ok: false, message: 'Amount too small' }
    set({
      xel: s.xel + q.out,
      tokens: { ...s.tokens, [p.ticker]: owned - tokenAmount },
      projects: s.projects.map((x) => x.id !== poolId ? x : {
        ...x,
        pool: x.pool && {
          ...x.pool,
          xel: x.pool.xel - q.gross,
          token: x.pool.token + tokenAmount,
          volume24h: x.pool.volume24h + q.out,
          fees24h: x.pool.fees24h + q.fee,
        },
      }),
      activity: [
        { id: uid(), ts: Date.now(), kind: 'swap' as const, projectId: poolId, actor: 'you', amountXel: q.out, tokens: tokenAmount, price: p.pool.xel / p.pool.token },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    return { ok: true, message: `Swapped ${tokenAmount.toLocaleString()} ${p.ticker} for ${q.out.toFixed(4)} XEL` }
  },

  addLiquidity: (poolId, xelAmount) => {
    const s = get()
    const p = s.projects.find((x) => x.id === poolId)
    if (!p || !p.pool) return { ok: false, message: 'Pool not found' }
    if (xelAmount < 1) return { ok: false, message: 'Minimum LP entry is 1 XEL' }
    if (xelAmount > s.xel) return { ok: false, message: 'Insufficient XEL balance' }
    const pool = p.pool
    const parts = (xelAmount * pool.totalParts) / pool.xel
    const tokenSide = (xelAmount * pool.token) / pool.xel // price-neutral add
    const owned = s.tokens[p.ticker] ?? 0
    if (tokenSide > owned) return { ok: false, message: `Needs ${tokenSide.toFixed(0)} ${p.ticker} on the token side (you have ${owned.toLocaleString()})` }

    set({
      xel: s.xel - xelAmount,
      tokens: { ...s.tokens, [p.ticker]: owned - tokenSide },
      projects: s.projects.map((x) => x.id !== poolId ? x : {
        ...x,
        pool: x.pool && {
          ...x.pool,
          xel: x.pool.xel + xelAmount,
          token: x.pool.token + tokenSide,
          totalParts: x.pool.totalParts + parts,
          withdrawableParts: x.pool.withdrawableParts + parts,
        },
      }),
      lps: (() => {
        const idx = s.lps.findIndex((lp) => lp.poolId === poolId)
        if (idx >= 0) {
          const lp = s.lps[idx]
          const next = [...s.lps]
          next[idx] = { ...lp, parts: lp.parts + parts, xelProvided: lp.xelProvided + xelAmount }
          return next
        }
        return [...s.lps, { poolId, parts, xelProvided: xelAmount, feesEarnedXel: 0 }]
      })(),
      activity: [
        { id: uid(), ts: Date.now(), kind: 'lp' as const, projectId: poolId, actor: 'you', amountXel: xelAmount, note: `added liquidity · ${xelAmount.toLocaleString()} XEL + ${tokenSide.toFixed(0)} ${p.ticker}` },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    return { ok: true, message: `Minted ${parts.toFixed(2)} LP parts · exit pro-rata at any time` }
  },

  removeLiquidity: (poolId, parts) => {
    const s = get()
    const p = s.projects.find((x) => x.id === poolId)
    const lp = s.lps.find((x) => x.poolId === poolId)
    if (!p || !p.pool || !lp) return { ok: false, message: 'No LP position' }
    if (parts <= 0 || parts > lp.parts) return { ok: false, message: 'Invalid parts amount' }
    const pool = p.pool
    const xelOut = (parts * pool.xel) / pool.totalParts
    const tokenOut = (parts * pool.token) / pool.totalParts
    const isFull = parts >= lp.parts - 1e-9

    set({
      xel: s.xel + xelOut,
      tokens: { ...s.tokens, [p.ticker]: (s.tokens[p.ticker] ?? 0) + tokenOut },
      projects: s.projects.map((x) => x.id !== poolId ? x : {
        ...x,
        pool: x.pool && {
          ...x.pool,
          xel: x.pool.xel - xelOut,
          token: x.pool.token - tokenOut,
          totalParts: x.pool.totalParts - parts,
          withdrawableParts: Math.max(0, x.pool.withdrawableParts - parts),
        },
      }),
      lps: isFull ? s.lps.filter((x) => x.poolId !== poolId) : s.lps.map((x) => x.poolId === poolId ? { ...x, parts: x.parts - parts } : x),
      activity: [
        { id: uid(), ts: Date.now(), kind: 'lp' as const, projectId: poolId, actor: 'you', amountXel: xelOut, note: `removed liquidity · ${xelOut.toFixed(2)} XEL + ${tokenOut.toFixed(0)} ${p.ticker} out` },
        ...s.activity,
      ].slice(0, ACTIVITY_CAP),
    })
    return { ok: true, message: `Burned ${parts.toFixed(2)} parts · received ${xelOut.toFixed(2)} XEL + ${tokenOut.toFixed(0)} ${p.ticker}` }
  },
}))

/** Atomic migration: bonding curve → LaunchDEX pool (protocol-locked seed). */
function migrateProject(projectId: string) {
  const s = useEngine.getState()
  const p = s.projects.find((x) => x.id === projectId)
  if (!p || !p.curve) return
  const migrationFee = p.curve.reserves * (PROTOCOL.migrationFeeBps / 10_000)
  const seedXel = p.curve.reserves - migrationFee
  const seedToken = p.curve.circulating // the curve's remaining inventory

  useEngine.setState((st) => ({
    event: { kind: 'migrated', projectId, name: p.name, ticker: p.ticker, ts: Date.now() },
    projects: st.projects.map((x) => x.id !== projectId ? x : {
      ...x,
      status: 'graduated' as const,
      curve: undefined,
      pool: {
        id: projectId,
        xel: seedXel,
        token: seedToken,
        feeBps: PROTOCOL.dexFeeBps,
        adminSplitBps: PROTOCOL.dexAdminSplitBps,
        seedLocked: seedXel,           // THE FLOOR: permanent, protocol-owned
        totalParts: seedXel,           // X11: seed mints parts = seed XEL
        withdrawableParts: 0,          // the seed can never be withdrawn
        history: [seedXel / seedToken],
        volume24h: 0,
        fees24h: 0,
      },
    }),
    activity: [
      {
        id: uid(), ts: Date.now(), kind: 'migration' as const, projectId, actor: 'protocol',
        amountXel: seedXel,
        note: `${p.ticker} MIGRATED to LaunchDEX · ${Math.round(seedXel).toLocaleString()} XEL + ${Math.round(seedToken).toLocaleString()} ${p.ticker} seeded · ${Math.round(seedXel).toLocaleString()} XEL of liquidity is LOCKED FOREVER`,
      },
      ...st.activity,
    ].slice(0, ACTIVITY_CAP),
  }))
  internal.migrating.delete(projectId)
}

/** Helper for components: live graduation progress of a project. */
export function graduationOf(p: Project): number {
  if (!p.curve) return 0
  return Math.min(1, p.curve.reserves / (p.curve.seed * PROTOCOL.graduationMultiplier))
}
