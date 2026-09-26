// Guide view — the complete on-site documentation of VaultLaunch on
// mainnet. Everything here reflects the DEPLOYED configuration (runbook
// 3, verified 16/16 storage reads on-chain on 23/09/2026); the
// parameter table reads its values LIVE from the chain via the store,
// so an admin tune shows up on its own.

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useCommunity } from '@/lib/launch/community-store'
import {
  VAULT_CONTRACT, DEX_CONTRACT, COMMUNITY_CONTRACT, PROTOCOL_WALLET,
  explorerContractUrl, explorerAddressUrl,
} from '@/lib/launch/protocol'
import { BracketButton } from './shared'
import { fmtXel } from '@/lib/launch/math'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'launch', label: 'Launch a coin' },
  { id: 'community', label: 'Community coins' },
  { id: 'trade', label: 'Trade' },
  { id: 'lp', label: 'Liquidity' },
  { id: 'verify', label: 'Verify' },
  { id: 'params', label: 'Parameters' },
  { id: 'faq', label: 'FAQ' },
] as const

type TabId = (typeof SECTIONS)[number]['id']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="border border-border/70 bg-card/50 p-6"
    >
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </motion.section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-border/70 bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </span>
  )
}

function Hash({ hash, kind = 'contract' }: { hash: string; kind?: 'contract' | 'address' }) {
  const url = kind === 'contract' ? explorerContractUrl(hash) : explorerAddressUrl(hash)
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="break-all font-mono text-[11px] text-vault hover:underline"
      title={hash}
    >
      {hash}
    </a>
  )
}

export function GuideView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const params = useMainnet((s) => s.params)
  const stats = useMainnet((s) => s.stats)
  const cParams = useCommunity((s) => s.cParams)
  const cStats = useCommunity((s) => s.cStats)
  const [tab, setTab] = useState<TabId>('how')

  const minDeposit = params.submissionFee + params.assetBudget + params.minLiquidity

  return (
    <div className="mx-auto max-w-4xl">
      {/* header */}
      <div className="mb-5 border border-vault/30 bg-vault/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-vault">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live on the XELIS mainnet since 23.09.2026
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              The VaultLaunch guide
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The community creates the coins. This guide covers everything: launching, voting,
              trading on the curve and the DEX, providing liquidity, and how to verify you are
              interacting with the real contracts.
            </p>
          </div>
          <BracketButton variant="strong" onClick={() => setView('create')}>
            Launch a coin →
          </BracketButton>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className={cn(
              'shrink-0 border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
              tab === s.id
                ? 'border-vault/50 bg-vault/10 text-vault'
                : 'border-border text-muted-foreground hover:border-vault/30 hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      {tab === 'how' && (
        <Section title="How it works — the lifecycle">
          <ol className="space-y-4">
            {[
              {
                n: '01',
                t: `Propose — ${fmtXel(minDeposit)} XEL minimum`,
                d: <>A creator deposits <Mono>{params.submissionFee} XEL fee</Mono> + <Mono>{params.assetBudget} XEL asset budget</Mono> + <Mono>{fmtXel(params.minLiquidity)} XEL minimum seed</Mono> and describes the project: name, ticker, links, total supply, team allocation and a vesting plan that the contract will bind. Anything above the minimum becomes extra curve liquidity.</>,
              },
              {
                n: '02',
                t: `The community decides — ~1 hour, ${params.minParticipants} voter(s), ${(params.minApprovalPct * 100).toFixed(0)}% approval`,
                d: <>Every XELIS wallet can vote — <span className="text-foreground">voting is free</span> (the deposit dial is at 0 on mainnet). Rejected projects refund <span className="text-foreground">100%</span> of the creator&apos;s funds.</>,
              },
              {
                n: '03',
                t: `Bonding curve — fee ${(params.tradingFeeBps / 100).toFixed(2)}%`,
                d: <>A constant-product curve opens with the seed. Price starts tiny and grows with every buy. Graduation hits when reserves reach <span className="text-foreground">{params.graduationMultiplier}× the seed</span> — a {fmtXel(params.minLiquidity)} XEL seed graduates at <span className="text-foreground">{fmtXel(params.minLiquidity * params.graduationMultiplier)} XEL</span>.</>,
              },
              {
                n: '04',
                t: `Graduation — fee drops to ${(params.graduatedFeeBps / 100).toFixed(2)}%`,
                d: <>Graduated projects trade at a LOWER fee, the team allocation unlocks, and a one-time migration fee of {params.migrationFeeBps / 100}% funds the protocol. A seed of ≥ <Mono>{fmtXel(params.directListingThreshold)} XEL</Mono> at propose graduates directly after validation — no bonding phase.</>,
              },
              {
                n: '05',
                t: `LaunchDEX — permanent liquidity, ${(params.dexFeeSplitBps / 100).toFixed(0)}% of fees to providers`,
                d: <>Migration moves the curve&apos;s reserves and inventory atomically into a LaunchDEX pool. The seed is <span className="text-foreground">protocol-locked forever</span> — the pool can never be drained below its migration. Providers deepen the pool and earn {(params.dexFeeSplitBps / 100).toFixed(0)}% of every {(params.dexSwapFeeBps / 100).toFixed(2)}% swap fee, pro-rata.</>,
              },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-vault">{s.n}</span>
                <div>
                  <div className="font-semibold text-foreground">{s.t}</div>
                  <p className="mt-1">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="border-t border-border/60 pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Every token is a REAL confidential XELIS asset: fixed max supply enforced by the XELIS
            protocol itself, buyers hold their tokens in their own wallets from the first second,
            balances are fully private.
          </p>
        </Section>
      )}

      {/* ── LAUNCH ── */}
      {tab === 'launch' && (
        <Section title="Launching a coin — the creator's guide">
          <p>
            Head to the <button onClick={() => setView('create')} className="text-vault hover:underline">Create a coin</button> page,
            fill in the project card and sign the deposit. The contract enforces everything
            client-side validation can only mirror:
          </p>
          <ul className="space-y-2.5">
            {[
              { k: 'name', v: '1–64 characters.' },
              { k: 'symbol', v: '1–16 characters, alphanumeric, UNIQUE forever — one launchpad project per ticker (the contract keeps the registry).' },
              { k: 'description', v: 'up to 512 characters — the community votes on exactly what you write.' },
              { k: 'links', v: 'website, logo, Twitter, Telegram, Discord — all optional, all updatable by you at any time.' },
              { k: 'total supply', v: 'between 1 and 100,000,000 whole tokens. This becomes the asset\'s FIXED max supply at creation — nothing can ever be minted past the cap.' },
              { k: 'team allocation', v: 'up to 20%. Reserved off the curve until graduation; a project that never graduates releases it after ~6 months of bonding.' },
              { k: 'vesting plan', v: '0 = the team claims at graduation; otherwise a linear vesting of 1 to 12 months — declared at propose, BOUND by the contract, voted on by the community.' },
              { k: `seed liquidity (min ${fmtXel(params.minLiquidity)} XEL)`, v: `the curve's starting reserves. At or above ${fmtXel(params.directListingThreshold)} XEL the project takes the DIRECT LISTING path — it graduates right after validation, no bonding phase.` },
            ].map((row) => (
              <li key={row.k} className="flex gap-3">
                <Mono>{row.k}</Mono>
                <span>{row.v}</span>
              </li>
            ))}
          </ul>
          <p className="border border-vault/25 bg-vault/5 p-3">
            <span className="font-semibold text-foreground">The two graduation paths.</span> A
            small float discovers price on the curve and graduates at{' '}
            <Mono>{params.graduationMultiplier}× the seed</Mono> ({fmtXel(params.minLiquidity * params.graduationMultiplier)} XEL of
            reserves for a minimum seed). A seed of <Mono>≥ {fmtXel(params.directListingThreshold)} XEL</Mono> skips
            bonding entirely.
          </p>
          <p>
            If the community rejects your project, <span className="text-foreground">100% of your
            funds are refundable</span> — claim them with the refund button on the project card.
          </p>
        </Section>
      )}

      {/* ── COMMUNITY COINS ── */}
      {tab === 'community' && (
        <Section title="Community coins — the pump.fun track">
          <p>
            Next to the serious shelf sits the casino, and it says so honestly. The{' '}
            <span className="text-foreground">community track</span> (CommunityLaunch v1.0.1, live
            since 25.09.2026) lets <span className="text-foreground">anyone launch a real XELIS
            confidential asset in one transaction for ≈ {fmtXel(cParams.submissionFee + cParams.assetBudget)} XEL</span> —
            no vote, no validation, no founder liquidity. This is NOT a quality filter: scams will
            launch here, and the design bounds what a scam can DO, not what a coin can BE.
          </p>
          <p>
            <span className="font-semibold text-foreground">The virtual-reserve curve.</span> The
            coin is born with {fmtXel(cParams.virtualXel)} XEL of VIRTUAL depth: a constant-product
            curve priced on <Mono>x = xr + vx</Mono> and <Mono>y = yr + y0</Mono> where the real
            reserves start at zero and the virtual sides never move. Your coin has a price, slippage
            and an order-book feel from the first buy — with zero founder capital. The math is
            solvency-proven: k never decreases, the worst-case sell is exactly covered.
          </p>
          <p>
            <span className="font-semibold text-foreground">Graduation = demand proof.</span> The
            coin graduates when the community&apos;s OWN money fills the curve:{' '}
            {fmtXel(cParams.graduationDepth)} XEL of real depth <span className="text-foreground">AND</span>{' '}
            price continuity (<Mono>xr·y0 ≥ yr·vx</Mono> — the pool opens at or above spot, no
            graduation dump). Graduation fires inside the very buy that crosses both conditions —
            XELIS has no timers.
          </p>
          <p>
            <span className="font-semibold text-foreground">Permissionless migration.</span> After
            graduation, anyone — the last buyer, a keeper bot, you — triggers the atomic migration
            into a permanent LaunchDEX pool through the open seeding endpoint. The{' '}
            {(cParams.migrationFeeBps / 100).toFixed(2)}% fee is carved from the SEED, never the
            live curve; the buyers&apos; own money becomes the protocol-locked anti-rug floor.
          </p>
          <p>
            <span className="font-semibold text-foreground">What a scam cannot do here:</span> the
            supply is fixed forever (enforced by the XELIS protocol itself), the creator never
            touches the liquidity (there is none of his to pull), the pool seed is locked for life,
            sells can NEVER be blocked (not even by the emergency pause — it only gates launches and
            buys), and there is no honeypot surface. What the contract cannot do for you: tell you
            which coin is worth anything. <span className="text-foreground">DYOR.</span>
          </p>
          <p className="border border-vlt/30 bg-vlt/[0.06] p-3 font-mono text-[10px] leading-relaxed">
            two tracks, one DEX lineage · projects: 526 XEL + community vote → pinned create_pool ·
            community: ~{fmtXel(cParams.submissionFee + cParams.assetBudget)} XEL + nothing → open
            create_pool_open (chunk 33) · {(cStats?.coinCount ?? 0)} coins launched so far ·
            {' '}{(cStats?.migratedCount ?? 0)} graduated to permanent pools
          </p>
        </Section>
      )}

      {/* ── TRADE ── */}
      {tab === 'trade' && (
        <Section title="Trading — curve and DEX">
          <p>
            <span className="font-semibold text-foreground">On the curve</span> (bonding phase):
            buys pay {(params.tradingFeeBps / 100).toFixed(2)}%, the exact output is{' '}
            <Mono>out = C·net/(R+net)</Mono> — integer-exact in the contract, u128 math. Sells are{' '}
            <span className="text-foreground">never blocked</span>: not by the trust system, not by
            a pause. The whole attached deposit is sold (whole-deposit semantics).
          </p>
          <p>
            <span className="font-semibold text-foreground">On the DEX</span> (after migration):
            constant-product swaps at {(params.dexSwapFeeBps / 100).toFixed(2)}%, split{' '}
            {(100 - params.dexFeeSplitBps / 100).toFixed(0)}/{(params.dexFeeSplitBps / 100).toFixed(0)} between
            the protocol and the pool&apos;s providers. Sells are never blocked here either — not
            even by the emergency pause.
          </p>
          <p>
            Every trade carries a <span className="text-foreground">min_out</span> (slippage
            protection): if the price moved beyond your tolerance, the transaction reverts and you
            keep your funds. The XELIS mempool is public and no MEV protection is claimed — set
            your slippage consciously (0.5–2% covers most pools).
          </p>
          <p className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed">
            fees: curve {(params.tradingFeeBps / 100).toFixed(2)}% → graduated curve {(params.graduatedFeeBps / 100).toFixed(2)}% →
            dex {(params.dexSwapFeeBps / 100).toFixed(2)}% · minimum buy 0.01 XEL · tokens are real XELIS
            assets in your wallet, transferable anywhere on XELIS
          </p>
        </Section>
      )}

      {/* ── LP ── */}
      {tab === 'lp' && (
        <Section title="Providing liquidity — earn half of every fee">
          <p>
            Anyone can deepen a LaunchDEX pool with <Mono>add_liquidity</Mono>: attach BOTH sides
            (XEL and the token) and the contract takes the largest price-neutral slice at the
            pool&apos;s current ratio — <span className="text-foreground">a deposit can never move
            the price</span>, the excess side is refunded. Minimum effective depth: 1 XEL.
          </p>
          <p>
            Providers earn <span className="text-foreground">{(params.dexFeeSplitBps / 100).toFixed(0)}% of every
            swap fee</span>, continuously, pro-rata of their share of the pool&apos;s depth —
            claimable at any time (<Mono>claim_lp_fees</Mono>), accruing live on the position.
          </p>
          <p>
            Exit is <span className="text-foreground">always open</span>: <Mono>remove_liquidity</Mono>{' '}
            pays the exact floored pro-rata of both reserves at the current ratio, with min_out
            protection on both sides. It works under ANY state — even the emergency pause. The
            only thing that can never be withdrawn is the migration seed itself.
          </p>
          <p className="border border-vault/25 bg-vault/5 p-3">
            <span className="font-semibold text-foreground">The permanent floor.</span> The
            migrated seed (the curve&apos;s reserves at graduation) is protocol-locked forever:
            its LP parts carry no withdrawable balance, and not even the admin can withdraw it.
            A pool can never be drained below its migration — the anti-dump guarantee.
          </p>
        </Section>
      )}

      {/* ── VERIFY ── */}
      {tab === 'verify' && (
        <Section title="Verify the contracts yourself — the golden rule">
          <p>
            <span className="font-semibold text-foreground">Never interact with any other address
            presented as &quot;the launchpad&quot;, &quot;the DEX&quot; or &quot;the community
            factory&quot;.</span> The three hashes below are the only ones deployed by the official
            wallet, and they are pinned to each other at the protocol level:
          </p>
          <div className="space-y-3">
            <div className="border border-border/60 bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                VaultLaunch — the launchpad (projects)
              </div>
              <div className="mt-1.5"><Hash hash={VAULT_CONTRACT} /></div>
            </div>
            <div className="border border-border/60 bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                LaunchDEX v1.4.1 — the DEX (BOTH tracks)
              </div>
              <div className="mt-1.5"><Hash hash={DEX_CONTRACT} /></div>
            </div>
            <div className="border border-vlt/30 bg-vlt/[0.05] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-vlt">
                CommunityLaunch — the community factory (pump.fun track)
              </div>
              <div className="mt-1.5"><Hash hash={COMMUNITY_CONTRACT} /></div>
            </div>
            <div className="border border-border/60 bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Official deployer wallet (the admin / moderation key)
              </div>
              <div className="mt-1.5"><Hash hash={PROTOCOL_WALLET} kind="address" /></div>
            </div>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2.5">
              <span className="text-vault">▣</span>
              <span>Storage <Mono>dxa</Mono> of the Vault = the DEX hash — only that DEX can receive a migration.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-vault">▣</span>
              <span>Storage <Mono>dxa</Mono> of the community factory = the same DEX hash — community
                coins migrate through its open endpoint (<Mono>create_pool_open</Mono>, chunk 33).</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-vault">▣</span>
              <span>Storage <Mono>lpx</Mono> of the DEX = the official wallet — the moderation key
                (project pools are created by that wallet; community pools are seeded openly but the
                pause hook stays pinned).</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-vault">▣</span>
              <span>Any &quot;clone&quot; that does not honor both pins is a fake. Check every hash in the{' '}
                <a href="https://explorer.xelis.io" target="_blank" rel="noreferrer" className="text-vault hover:underline">
                  official explorer ↗
                </a> before sending funds.
              </span>
            </li>
          </ul>
          <p className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed">
            deployment confirmed on-chain 23/09/2026 · 16/16 configuration keys verified ·
            the full deployment record (TX hashes, topos) lives in the protocol repo:
            <a href="https://github.com/XelisVault/xelis-vault/blob/main/docs/runbooks/RUNBOOK3_MAINNET_INTERACTIONS.md" target="_blank" rel="noreferrer" className="ml-1 text-vault hover:underline">
              RUNBOOK 3 ↗
            </a>
          </p>
        </Section>
      )}

      {/* ── PARAMS ── */}
      {tab === 'params' && (
        <Section title="On-chain parameters — read live from the chain">
          <p>
            These are not documentation numbers: every value below is read from the contracts&apos;
            storage on the XELIS mainnet. An admin tune shows up here on its own.
          </p>
          <div className="overflow-x-auto border border-border/60">
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {([
                  ['Submission fee', `${params.submissionFee} XEL`, 'sub'],
                  ['Asset budget (refundable)', `${params.assetBudget} XEL`, 'abd'],
                  ['Minimum seed liquidity', `${fmtXel(params.minLiquidity)} XEL`, 'mnl'],
                  ['Minimum deposit at propose', `${fmtXel(minDeposit)} XEL`, 'computed'],
                  ['Minimum participants', String(params.minParticipants), 'mnp'],
                  ['Approval ratio', `${(params.minApprovalPct * 100).toFixed(0)}%`, 'mab'],
                  ['Validation window', `${params.validationDuration} topos ≈ 1h`, 'vdt'],
                  ['Graduation multiplier', `×${params.graduationMultiplier}`, 'gmu'],
                  ['Direct-listing threshold', `${fmtXel(params.directListingThreshold)} XEL`, 'dlt'],
                  ['Bonding fee', `${(params.tradingFeeBps / 100).toFixed(2)}%`, 'tfe'],
                  ['Graduated fee', `${(params.graduatedFeeBps / 100).toFixed(2)}%`, 'gfe'],
                  ['Migration fee (one-time)', `${(params.migrationFeeBps / 100).toFixed(2)}%`, 'mgf'],
                  ['Vote deposit', params.voteDeposit > 0 ? `${params.voteDeposit} XEL` : 'free', 'vdp'],
                  ['DEX swap fee', `${(params.dexSwapFeeBps / 100).toFixed(2)}%`, 'sfe'],
                  ['DEX LP share of fees', `${(params.dexFeeSplitBps / 100).toFixed(0)}%`, 'fsl'],
                  ['Team unlock delay', `~${(params.teamUnlockDelay / 630_720).toFixed(1)} months of bonding`, 'tdy'],
                  ['Vesting bounds', '1–12 months', 'vmn / vmx'],
                  ['Launchpad paused', params.paused ? 'YES' : 'no', 'pz'],
                  ['DEX emergency pause', params.dexEmergency ? 'YES' : 'no', 'xpa'],
                ] as [string, string, string][]).map(([k, v, key]) => (
                  <tr key={key} className="border-b border-border/40 last:border-b-0">
                    <td className="px-3 py-2 text-muted-foreground">{k}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">{v}</td>
                    <td className="px-3 py-2 text-right text-[9px] text-muted-foreground/50">{key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats && (
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              protocol scoreboard: {stats.projectCount} projects · {stats.migratedCount} migrated ·{' '}
              {stats.totalTrades} trades · {(Number(stats.totalVolume) / 1e8).toLocaleString('en-US', { maximumFractionDigits: 2 })} XEL total volume
            </p>
          )}
        </Section>
      )}

      {/* ── FAQ ── */}
      {tab === 'faq' && (
        <Section title="FAQ">
          <div className="space-y-5">
            {[
              {
                q: `Why ${fmtXel(minDeposit)} XEL to propose a coin?`,
                a: `${params.submissionFee} XEL submission fee (to the protocol) + ${params.assetBudget} XEL asset budget (covers the chain's asset-creation cost, unused part refunded) + ${fmtXel(params.minLiquidity)} XEL seed liquidity (the curve minimum; refunded if rejected, locked forever in the pool otherwise).`,
              },
              {
                q: 'Does voting cost anything?',
                a: 'No. The vote-deposit dial is at 0 on mainnet — voting is free, one vote per address, and the window lasts ~1 hour.',
              },
              {
                q: 'What guarantees the token is real?',
                a: 'At validation success the contract creates a native XELIS asset with MaxSupplyMode::Fixed: the entire supply exists from birth, is held by the contract, and NOTHING can ever be minted past the cap — enforced by the XELIS protocol itself, not by our code. Buyers hold real tokens in their own wallets.',
              },
              {
                q: 'Can the pool liquidity be fully withdrawn?',
                a: 'No. The migrated seed is locked forever — not even the admin can withdraw it. Only provider contributions above the seed are withdrawable, pro-rata.',
              },
              {
                q: 'Can a rug happen?',
                a: 'The contract-favouring integer math, the locked seed, the ungated sells and the two protocol pins close every rug path the protocol can close. What it cannot close: the team allocation (≤ 20%, vesting plan voted on and bound on-chain) and market risk. Do your own research — the community vote is the first filter, not a guarantee.',
              },
              {
                q: 'Audited?',
                a: 'Internally audited and machine-checked in CI on every push (audit-derived Silex linter, full Python reference test suite, five formal audit scripts, chunk-id and structure gates). No external, independent audit yet — the honest phrasing. Specs and threat models are public in the protocol repo.',
              },
              {
                q: 'How do I run the numbers myself?',
                a: 'The protocol repo ships a Python CLI: pip install ./sdk/xvault, then xvault launchpad quote --reserves 500 --curve 90000000 --buy 100. The same math this app shows, offline.',
              },
              {
                q: 'Which wallet do I need?',
                a: 'Any XELIS wallet with XSWD: Genesix (GUI) or xelis_wallet (CLI), connected to a MAINNET daemon, XSWD enabled on ws://127.0.0.1:44325.',
              },
            ].map((f) => (
              <div key={f.q}>
                <div className="font-semibold text-foreground">{f.q}</div>
                <p className="mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
