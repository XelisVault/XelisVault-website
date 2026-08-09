/**
 * Secure Wallet Storage
 *
 * Encrypts the XELIS private key (32 bytes) with a user password using
 * the browser's native Web Crypto API:
 *   - PBKDF2-SHA256 with 600,000 iterations (OWASP 2023 recommendation)
 *   - AES-256-GCM for authenticated encryption
 *   - Random 16-byte salt per wallet (stored alongside ciphertext)
 *   - Random 12-byte IV per encryption (stored alongside ciphertext)
 *
 * The seed phrase never leaves the browser. Nothing is sent to any server.
 *
 * Storage format (base64-encoded JSON in localStorage):
 * {
 *   version: 1,
 *   name: string,         // user-chosen wallet name
 *   salt: base64,         // 16 bytes
 *   iv: base64,           // 12 bytes
 *   ciphertext: base64,   // 32-byte key + auth tag
 *   createdAt: number,    // epoch ms
 *   network: 'mainnet' | 'testnet',
 * }
 *
 * Multiple wallets are stored under different localStorage keys so users
 * can have several wallets (e.g. one for testing, one for real funds).
 */

const STORAGE_PREFIX = 'xelis-vault-wallet:'
const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 32 // AES-256

export type Network = 'mainnet' | 'testnet'

export interface EncryptedWallet {
  version: 1
  name: string
  salt: string // base64
  iv: string // base64
  ciphertext: string // base64
  createdAt: number
  network: Network
}

export interface WalletMeta {
  name: string
  network: Network
  createdAt: number
}

// ---- base64 helpers (since localStorage stores strings) ----

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ---- key derivation ----

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ---- public API ----

/**
 * List all stored wallet names (without decrypting them).
 */
export function listStoredWallets(): WalletMeta[] {
  const wallets: WalletMeta[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}') as EncryptedWallet
      if (data.version === 1 && data.name) {
        wallets.push({
          name: data.name,
          network: data.network,
          createdAt: data.createdAt,
        })
      }
    } catch {
      // skip malformed entries
    }
  }
  return wallets.sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * Encrypt and store a private key under a wallet name.
 * Overwrites if a wallet with the same name already exists.
 */
export async function storeWallet(
  name: string,
  password: string,
  privateKey: Uint8Array,
  network: Network = 'testnet'
): Promise<void> {
  if (privateKey.length !== 32) {
    throw new Error('Private key must be 32 bytes')
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const enc = new TextEncoder()
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, privateKey)
  )

  const data: EncryptedWallet = {
    version: 1,
    name,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    createdAt: Date.now(),
    network,
  }

  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data))
}

/**
 * Decrypt and load a private key from storage.
 * Throws if the password is wrong (AES-GCM auth tag fails).
 */
export async function loadWallet(name: string, password: string): Promise<Uint8Array> {
  const raw = localStorage.getItem(STORAGE_PREFIX + name)
  if (!raw) throw new Error(`Wallet "${name}" not found`)
  const data = JSON.parse(raw) as EncryptedWallet
  if (data.version !== 1) throw new Error(`Unsupported wallet version: ${data.version}`)

  const salt = base64ToBytes(data.salt)
  const iv = base64ToBytes(data.iv)
  const ciphertext = base64ToBytes(data.ciphertext)
  const key = await deriveKey(password, salt)

  try {
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    )
    if (plaintext.length !== 32) {
      throw new Error(`Decrypted key has wrong length: ${plaintext.length}`)
    }
    return plaintext
  } catch {
    throw new Error('Wrong password. Please try again.')
  }
}

/**
 * Check if a wallet name exists (without decrypting).
 */
export function walletExists(name: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + name) !== null
}

/**
 * Permanently delete a stored wallet. Cannot be undone.
 */
export function deleteWallet(name: string): void {
  localStorage.removeItem(STORAGE_PREFIX + name)
}

/**
 * Change the password on an existing wallet. Requires the current password.
 */
export async function changePassword(
  name: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters')
  }
  const privateKey = await loadWallet(name, oldPassword)
  await storeWallet(name, newPassword, privateKey)
}

/**
 * Export the encrypted wallet as a JSON file (for backup).
 * The backup is encrypted — safe to store on a USB stick or cloud.
 */
export function exportEncryptedWallet(name: string): string {
  const raw = localStorage.getItem(STORAGE_PREFIX + name)
  if (!raw) throw new Error(`Wallet "${name}" not found`)
  return raw
}

/**
 * Import an encrypted wallet from a JSON backup.
 */
export function importEncryptedWallet(json: string, newName?: string): void {
  const data = JSON.parse(json) as EncryptedWallet
  if (data.version !== 1) throw new Error(`Unsupported wallet version: ${data.version}`)
  const name = newName || data.name
  if (walletExists(name)) {
    throw new Error(`A wallet named "${name}" already exists. Use a different name.`)
  }
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data))
}
