// CLI fallback helpers — copyable commands for the official XELIS Vault CLI.
// Installer: curl -fsSL https://xelisvault.github.io/xelis-vault/install | bash
// Tools: xvault (community CLI) · xvault-miner (miner TUI) · xvault-relayer (chat relayer)

export const CLI_INSTALL = {
  linux: 'curl -fsSL https://xelisvault.github.io/xelis-vault/install | bash',
  windows: 'irm https://xelisvault.github.io/xelis-vault/install.ps1 | iex',
}

export const CLI_UNINSTALL = {
  linux: 'curl -fsSL https://xelisvault.github.io/xelis-vault/install | bash -s -- --uninstall',
  windows: 'irm https://xelisvault.github.io/xelis-vault/install.ps1 -Args "--uninstall" | iex',
}

export const DISCORD_URL = 'https://discord.gg/UHpYAWbG'
export const GITHUB_URL = 'https://github.com/XelisVault/xelis-vault'
export const GENESIX_URL = 'https://github.com/xelis-project/xelis-genesix-wallet/releases'
export const XELIS_FAUCET_URL = 'https://faucet.xelis.io'

/** Copy text to clipboard with a small helper returning success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/** CLI equivalents for app actions (shown as fallback in each module). */
export const CLI_COMMANDS = {
  install: {
    title: 'Install the CLI',
    linux: CLI_INSTALL.linux,
    windows: CLI_INSTALL.windows,
    hint: 'Installs xvault, xvault-miner and xvault-relayer (~/.xelis-vault)',
  },
  startMiner: {
    title: 'Run a miner',
    setup: 'xvault-miner --setup',
    start: 'xvault-miner --miner --services oracle',
    dashboard: 'xvault-miner',
    hint: 'Stake ≥ 1,000 VLT. Press C to compound rewards, Q to quit.',
  },
  vault: {
    deposit: 'xvault --vault   # menu: deposit XEL collateral',
    borrow: 'xvault --vault   # menu: borrow xUSD',
    repay: 'xvault --vault   # menu: repay',
    withdraw: 'xvault --vault   # menu: withdraw',
  },
  swap: {
    psm: 'xvault --swap    # menu: PSM mint / redeem',
    amm: 'xvault --swap    # menu: AMM swap',
    liquidity: 'xvault --swap    # menu: add liquidity',
  },
  governance: {
    stake: 'xvault --governance   # menu: stake VLT',
    vote: 'xvault --governance   # menu: vote',
  },
  chat: {
    relayer: 'xvault-relayer   # run a VaultChat relayer node',
    send: 'xvault          # menu: Chat → send E2E message',
  },
  balance: {
    check: 'xvault --balance',
  },
  airdrop: {
    register: 'xvault          # menu: Airdrop → register mainnet address',
    points: 'xvault          # menu: Airdrop → my points',
  },
  wallet: {
    check: 'xvault --balance   # all balances from the CLI',
  },
} as const
