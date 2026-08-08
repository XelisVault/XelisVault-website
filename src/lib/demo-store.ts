import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
  | 'vault'
  | 'swap'
  | 'psm'
  | 'mixer'
  | 'savings'
  | 'governance'
  | 'chat'
  | 'oracle'
  | 'miner'

export interface TxHistory {
  id: string
  ts: number
  type: 'deposit' | 'borrow' | 'repay' | 'withdraw' | 'swap' | 'mint' | 'redeem' | 'mixer_deposit' | 'mixer_withdraw' | 'savings_deposit' | 'savings_withdraw' | 'vote'
  amount: string
  asset: string
  description: string
  status: 'confirmed'
  hash: string
}

export interface MixerNote {
  id: string
  denomination: 10 | 100 | 1000
  asset: 'xUSD' | 'VLT'
  secret: string
  nullifier: string
  depositedAt: number
  withdrawn: boolean
}

export interface Proposal {
  id: string
  title: string
  description: string
  status: 'active' | 'passed' | 'failed'
  forVotes: number
  againstVotes: number
  endTime: number
  voted?: 'for' | 'against' | null
}

export interface ChatMessage {
  id: string
  from: 'me' | 'them'
  text: string
  ts: number
  status: 'sent' | 'delivered' | 'read'
}

export interface OracleProvider {
  id: string
  address: string
  stake: number
  reputation: number
  lastPrice: number
  status: 'active' | 'slashed'
  uptime: number
}

interface DemoState {
  // wallet
  address: string
  xelBalance: number
  xusdBalance: number
  vltBalance: number
  vltStaked: number
  reputation: number

  // vault position
  collateralXel: number
  debtXusd: number
  liquidationPrice: number

  // oracle prices (USD)
  xelPrice: number
  vltPrice: number

  // savings
  savingsXusd: number
  savingsEarned: number
  savingsLastUpdate: number

  // mixer
  mixerNotes: MixerNote[]

  // governance
  proposals: Proposal[]

  // chat
  chatMessages: ChatMessage[]

  // oracle providers
  providers: OracleProvider[]

  // history
  history: TxHistory[]

  // ui
  activeModule: ModuleId
  open: boolean

  // actions
  openApp: () => void
  closeApp: () => void
  setModule: (m: ModuleId) => void
  depositCollateral: (amount: number) => void
  withdrawCollateral: (amount: number) => void
  borrowXusd: (amount: number) => void
  repayXusd: (amount: number) => void
  swap: (from: 'XEL' | 'xUSD' | 'VLT', to: 'XEL' | 'xUSD' | 'VLT', amount: number) => void
  mintXusd: (xelAmount: number) => void
  redeemXusd: (xusdAmount: number) => void
  mixerDeposit: (denomination: 10 | 100 | 1000, asset: 'xUSD' | 'VLT') => void
  mixerWithdraw: (noteId: string) => void
  savingsDeposit: (amount: number) => void
  savingsWithdraw: (amount: number) => void
  tick: () => void
  vote: (proposalId: string, choice: 'for' | 'against') => void
  sendChat: (text: string) => void
  pushHistory: (tx: Omit<TxHistory, 'id' | 'ts' | 'status' | 'hash'>) => void
}

const XEL_PRICE = 12.45
const VLT_PRICE = 4.82
const MAX_LTV = 0.66 // ~66% LTV (150% collateral ratio threshold)
const LIQUIDATION_THRESHOLD = 0.66 // liquidate at 150% collateral ratio

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function fakeHash() {
  return '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
}

function fakeAddress() {
  return 'xel1' + Array.from({ length: 38 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('')
}

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    title: 'Add XAU/USD oracle feed',
    description: 'Enable gold price feed for commodity-backed RWA vaults. StakedOracle will aggregate from 3 sources (Kitco, GoldAPI, CoinGecko) every 25s.',
    status: 'active',
    forVotes: 842000,
    againstVotes: 124000,
    endTime: Date.now() + 1000 * 60 * 60 * 38,
  },
  {
    id: 'prop-2',
    title: 'Increase borrow fee from 0.5% to 0.75%',
    description: 'Adjust VaultEngine borrow fee to better align with current testnet utilization (78%). 50% of the increase goes to VLT burn.',
    status: 'active',
    forVotes: 421000,
    againstVotes: 387000,
    endTime: Date.now() + 1000 * 60 * 60 * 12,
  },
  {
    id: 'prop-3',
    title: 'Add EUR/USD oracle feed',
    description: 'Add Euro oracle for European RWA tokenization. Median aggregation every 25s, slashing rules identical to XEL/USD.',
    status: 'active',
    forVotes: 1240000,
    againstVotes: 89000,
    endTime: Date.now() + 1000 * 60 * 60 * 72,
  },
  {
    id: 'prop-4',
    title: 'Lower PSM fee from 0.1% to 0.05%',
    description: 'Reduce PSM mint/redeem fee to improve peg tightness. Burn portion remains at 50% of collected fees.',
    status: 'passed',
    forVotes: 2100000,
    againstVotes: 145000,
    endTime: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
]

const INITIAL_PROVIDERS: OracleProvider[] = [
  { id: 'p1', address: fakeAddress(), stake: 5000, reputation: 9420, lastPrice: 12.45, status: 'active', uptime: 99.8 },
  { id: 'p2', address: fakeAddress(), stake: 1200, reputation: 8765, lastPrice: 12.46, status: 'active', uptime: 99.5 },
  { id: 'p3', address: fakeAddress(), stake: 800, reputation: 7890, lastPrice: 12.44, status: 'active', uptime: 98.9 },
  { id: 'p4', address: fakeAddress(), stake: 300, reputation: 6540, lastPrice: 12.47, status: 'active', uptime: 99.1 },
  { id: 'p5', address: fakeAddress(), stake: 1500, reputation: 8230, lastPrice: 12.45, status: 'active', uptime: 99.7 },
  { id: 'p6', address: fakeAddress(), stake: 200, reputation: 4100, lastPrice: 12.43, status: 'active', uptime: 97.2 },
  { id: 'p7', address: fakeAddress(), stake: 100, reputation: 1850, lastPrice: 12.42, status: 'active', uptime: 96.5 },
  { id: 'p8', address: fakeAddress(), stake: 600, reputation: 2340, lastPrice: 12.49, status: 'slashed', uptime: 88.3 },
]

const INITIAL_CHAT: ChatMessage[] = [
  { id: 'm1', from: 'them', text: '0x4f9a...c2b1', ts: Date.now() - 60000 * 8, status: 'read' },
  { id: 'm2', from: 'me', text: '••••••••••••', ts: Date.now() - 60000 * 7, status: 'read' },
  { id: 'm3', from: 'them', text: '0x9d3e...1f7a', ts: Date.now() - 60000 * 6, status: 'read' },
  { id: 'm4', from: 'them', text: '0xb27c...e4a8', ts: Date.now() - 60000 * 2, status: 'delivered' },
]

const SWAP_RATES: Record<string, number> = {
  'XEL->xUSD': XEL_PRICE,
  'xUSD->XEL': 1 / XEL_PRICE,
  'XEL->VLT': XEL_PRICE / VLT_PRICE,
  'VLT->XEL': VLT_PRICE / XEL_PRICE,
  'xUSD->VLT': 1 / VLT_PRICE,
  'VLT->xUSD': VLT_PRICE,
}

const SWAP_FEE = 0.003

export const useDemo = create<DemoState>((set, get) => ({
  address: 'xel1q7y2h4f6k8d3n5m9p0r2s4t6v8w0x2y4z6a8b9c',
  xelBalance: 142.8,
  xusdBalance: 6240.50,
  vltBalance: 1850.0,
  vltStaked: 500,
  reputation: 7420,

  collateralXel: 88.4,
  debtXusd: 412.30,
  liquidationPrice: XEL_PRICE * (1 - LIQUIDATION_THRESHOLD),

  xelPrice: XEL_PRICE,
  vltPrice: VLT_PRICE,

  savingsXusd: 2400,
  savingsEarned: 18.42,
  savingsLastUpdate: Date.now(),

  mixerNotes: [
    { id: 'n1', denomination: 100, asset: 'xUSD', secret: '0x8e2f...a91c', nullifier: '0x4f1d...c2b8', depositedAt: Date.now() - 86400000 * 2, withdrawn: false },
    { id: 'n2', denomination: 10, asset: 'xUSD', secret: '0x3a7b...e4f9', nullifier: '0xd8c1...3a5e', depositedAt: Date.now() - 86400000 * 5, withdrawn: true },
  ],

  proposals: INITIAL_PROPOSALS,

  chatMessages: INITIAL_CHAT,

  providers: INITIAL_PROVIDERS,

  history: [
    { id: 'h1', ts: Date.now() - 60000 * 12, type: 'swap', amount: '50.00', asset: 'XEL', description: 'Swap 50 XEL → 622.50 xUSD on VaultSwap', status: 'confirmed', hash: fakeHash() },
    { id: 'h2', ts: Date.now() - 60000 * 45, type: 'borrow', amount: '200.00', asset: 'xUSD', description: 'Borrow 200 xUSD against XEL collateral', status: 'confirmed', hash: fakeHash() },
    { id: 'h3', ts: Date.now() - 3600000 * 3, type: 'deposit', amount: '40.00', asset: 'XEL', description: 'Deposit 40 XEL as collateral', status: 'confirmed', hash: fakeHash() },
    { id: 'h4', ts: Date.now() - 3600000 * 8, type: 'savings_deposit', amount: '1000.00', asset: 'xUSD', description: 'Deposit 1,000 xUSD into SavingsRate', status: 'confirmed', hash: fakeHash() },
    { id: 'h5', ts: Date.now() - 86400000 * 2, type: 'mixer_deposit', amount: '100.00', asset: 'xUSD', description: 'Mixer deposit · denomination 100 xUSD', status: 'confirmed', hash: fakeHash() },
  ],

  activeModule: 'dashboard',
  open: false,

  openApp: () => set({ open: true }),
  closeApp: () => set({ open: false }),
  setModule: (m) => set({ activeModule: m }),

  depositCollateral: (amount) => {
    const s = get()
    if (amount > s.xelBalance) return
    const newCollateral = s.collateralXel + amount
    const newLiquidation = (s.debtXusd / newCollateral / XEL_PRICE) * XEL_PRICE / LIQUIDATION_THRESHOLD
    set({
      xelBalance: s.xelBalance - amount,
      collateralXel: newCollateral,
      liquidationPrice: s.debtXusd > 0 ? s.debtXusd / newCollateral / LIQUIDATION_THRESHOLD : 0,
    })
    get().pushHistory({ type: 'deposit', amount: amount.toFixed(2), asset: 'XEL', description: `Deposit ${amount.toFixed(2)} XEL as collateral` })
  },

  withdrawCollateral: (amount) => {
    const s = get()
    if (amount > s.collateralXel) return
    const newCollateral = s.collateralXel - amount
    const newLiq = s.debtXusd > 0 ? s.debtXusd / newCollateral / LIQUIDATION_THRESHOLD : 0
    if (s.debtXusd > 0 && XEL_PRICE / newLiq < 1.05) return // would liquidate
    set({
      xelBalance: s.xelBalance + amount,
      collateralXel: newCollateral,
      liquidationPrice: newLiq,
    })
    get().pushHistory({ type: 'withdraw', amount: amount.toFixed(2), asset: 'XEL', description: `Withdraw ${amount.toFixed(2)} XEL from collateral` })
  },

  borrowXusd: (amount) => {
    const s = get()
    const maxBorrow = s.collateralXel * XEL_PRICE * MAX_LTV - s.debtXusd
    if (amount > maxBorrow || amount <= 0) return
    const newDebt = s.debtXusd + amount
    const newLiq = newDebt / s.collateralXel / LIQUIDATION_THRESHOLD
    set({
      xusdBalance: s.xusdBalance + amount,
      debtXusd: newDebt,
      liquidationPrice: newLiq,
    })
    get().pushHistory({ type: 'borrow', amount: amount.toFixed(2), asset: 'xUSD', description: `Borrow ${amount.toFixed(2)} xUSD against XEL collateral` })
  },

  repayXusd: (amount) => {
    const s = get()
    const repay = Math.min(amount, s.debtXusd, s.xusdBalance)
    if (repay <= 0) return
    const newDebt = s.debtXusd - repay
    set({
      xusdBalance: s.xusdBalance - repay,
      debtXusd: newDebt,
      liquidationPrice: newDebt > 0 ? newDebt / s.collateralXel / LIQUIDATION_THRESHOLD : 0,
    })
    get().pushHistory({ type: 'repay', amount: repay.toFixed(2), asset: 'xUSD', description: `Repay ${repay.toFixed(2)} xUSD` })
  },

  swap: (from, to, amount) => {
    const s = get()
    if (amount <= 0) return
    const key = `${from}->${to}`
    if (key === `${from}->${from}`) return
    const rate = SWAP_RATES[key]
    if (!rate) return
    // check balance
    const balanceMap = { XEL: s.xelBalance, xUSD: s.xusdBalance, VLT: s.vltBalance }
    if (amount > balanceMap[from]) return
    const output = amount * rate * (1 - SWAP_FEE)
    const newBalance = { ...balanceMap }
    newBalance[from] -= amount
    newBalance[to] += output
    set({
      xelBalance: newBalance.XEL,
      xusdBalance: newBalance.xUSD,
      vltBalance: newBalance.VLT,
    })
    get().pushHistory({ type: 'swap', amount: amount.toFixed(2), asset: from, description: `Swap ${amount.toFixed(2)} ${from} → ${output.toFixed(2)} ${to}` })
  },

  mintXusd: (xelAmount) => {
    const s = get()
    if (xelAmount <= 0 || xelAmount > s.xelBalance) return
    const xusdOut = xelAmount * XEL_PRICE * (1 - 0.005) // 0.5% PSM fee (v5.0)
    set({
      xelBalance: s.xelBalance - xelAmount,
      xusdBalance: s.xusdBalance + xusdOut,
    })
    get().pushHistory({ type: 'mint', amount: xusdOut.toFixed(2), asset: 'xUSD', description: `Mint ${xusdOut.toFixed(2)} xUSD via PSM (burned ${xelAmount.toFixed(2)} XEL)` })
  },

  redeemXusd: (xusdAmount) => {
    const s = get()
    if (xusdAmount <= 0 || xusdAmount > s.xusdBalance) return
    const xelOut = xusdAmount / XEL_PRICE * (1 - 0.005)
    set({
      xusdBalance: s.xusdBalance - xusdAmount,
      xelBalance: s.xelBalance + xelOut,
    })
    get().pushHistory({ type: 'redeem', amount: xelOut.toFixed(2), asset: 'XEL', description: `Redeem ${xusdAmount.toFixed(2)} xUSD → ${xelOut.toFixed(2)} XEL via PSM` })
  },

  mixerDeposit: (denomination, asset) => {
    const s = get()
    const balance = asset === 'xUSD' ? s.xusdBalance : s.vltBalance
    if (denomination > balance) return
    const note: MixerNote = {
      id: uid(),
      denomination,
      asset,
      secret: '0x' + Array.from({ length: 8 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('') + '...' + Array.from({ length: 4 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      nullifier: '0x' + Array.from({ length: 8 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('') + '...' + Array.from({ length: 4 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      depositedAt: Date.now(),
      withdrawn: false,
    }
    if (asset === 'xUSD') {
      set({ xusdBalance: s.xusdBalance - denomination, mixerNotes: [note, ...s.mixerNotes] })
    } else {
      set({ vltBalance: s.vltBalance - denomination, mixerNotes: [note, ...s.mixerNotes] })
    }
    get().pushHistory({ type: 'mixer_deposit', amount: denomination.toString(), asset, description: `Mixer deposit · denomination ${denomination} ${asset}` })
  },

  mixerWithdraw: (noteId) => {
    const s = get()
    const note = s.mixerNotes.find((n) => n.id === noteId)
    if (!note || note.withdrawn) return
    const updated = s.mixerNotes.map((n) => n.id === noteId ? { ...n, withdrawn: true } : n)
    if (note.asset === 'xUSD') {
      set({ xusdBalance: s.xusdBalance + note.denomination, mixerNotes: updated })
    } else {
      set({ vltBalance: s.vltBalance + note.denomination, mixerNotes: updated })
    }
    get().pushHistory({ type: 'mixer_withdraw', amount: note.denomination.toString(), asset: note.asset, description: `Mixer withdraw · ${note.denomination} ${note.asset} (ZK proven)` })
  },

  savingsDeposit: (amount) => {
    const s = get()
    if (amount <= 0 || amount > s.xusdBalance) return
    set({
      xusdBalance: s.xusdBalance - amount,
      savingsXusd: s.savingsXusd + amount,
      savingsLastUpdate: Date.now(),
    })
    get().pushHistory({ type: 'savings_deposit', amount: amount.toFixed(2), asset: 'xUSD', description: `Deposit ${amount.toFixed(2)} xUSD into SavingsRate` })
  },

  savingsWithdraw: (amount) => {
    const s = get()
    if (amount <= 0 || amount > s.savingsXusd) return
    set({
      xusdBalance: s.xusdBalance + amount,
      savingsXusd: s.savingsXusd - amount,
      savingsLastUpdate: Date.now(),
    })
    get().pushHistory({ type: 'savings_withdraw', amount: amount.toFixed(2), asset: 'xUSD', description: `Withdraw ${amount.toFixed(2)} xUSD from SavingsRate` })
  },

  tick: () => {
    const s = get()
    if (s.savingsXusd > 0) {
      const now = Date.now()
      const elapsed = (now - s.savingsLastUpdate) / 1000 // sec
      const apy = 0.05 // 5% (v5.0 default)
      const earned = s.savingsXusd * apy * (elapsed / (365 * 24 * 3600))
      set({
        savingsEarned: s.savingsEarned + earned,
        savingsLastUpdate: now,
        xelPrice: s.xelPrice + (Math.random() - 0.5) * 0.02,
        vltPrice: s.vltPrice + (Math.random() - 0.5) * 0.01,
      })
    }
  },

  vote: (proposalId, choice) => {
    const s = get()
    const votingPower = s.vltBalance + s.vltStaked
    const proposals = s.proposals.map((p) => {
      if (p.id !== proposalId || p.voted) return p
      if (choice === 'for') {
        return { ...p, forVotes: p.forVotes + votingPower, voted: 'for' as const }
      } else {
        return { ...p, againstVotes: p.againstVotes + votingPower, voted: 'against' as const }
      }
    })
    set({ proposals })
    get().pushHistory({ type: 'vote', amount: votingPower.toFixed(2), asset: 'VLT', description: `Vote ${choice.toUpperCase()} on proposal ${proposalId} (${votingPower.toFixed(0)} VLT voting power)` })
  },

  sendChat: (text) => {
    const s = get()
    const myMsg: ChatMessage = {
      id: uid(),
      from: 'me',
      text: text.match(/^[0-9a-fx.•]+$/i) ? '••••••••••••' : '0x' + Array.from({ length: 8 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      ts: Date.now(),
      status: 'sent',
    }
    const updated = [...s.chatMessages, myMsg]
    set({ chatMessages: updated })
    // simulate reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: uid(),
        from: 'them',
        text: '0x' + Array.from({ length: 8 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('') + '...' + Array.from({ length: 4 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        ts: Date.now(),
        status: 'delivered',
      }
      set({ chatMessages: [...useDemo.getState().chatMessages, reply] })
    }, 1500)
  },

  pushHistory: (tx) => {
    const s = get()
    const newTx: TxHistory = {
      ...tx,
      id: uid(),
      ts: Date.now(),
      status: 'confirmed',
      hash: fakeHash(),
    }
    set({ history: [newTx, ...s.history].slice(0, 50) })
  },
}))
