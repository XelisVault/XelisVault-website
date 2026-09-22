// VaultLaunch access gate — the application is a PRIVATE preview.
//
// The route is excluded from the sitemap, disallowed in robots.txt and
// carries noindex meta. On top of that, a client-side gate keeps casual
// visitors out: unlock with the access key in the URL (?key=…) or by
// typing the passphrase. The session is remembered in sessionStorage.
//
// NOTE: this is a static site, so the gate is a courtesy lock, not server
// security. For real access control, enable password protection at the
// hosting layer (Vercel Protection Proxy or equivalent).

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/** The preview passphrase. Share the link, not the code, with strangers. */
const ACCESS_KEY = 'xel2026launch'
const STORAGE_KEY = 'xv-launch-access-v1'

export function hasLaunchAccess(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return true
    const url = new URL(window.location.href)
    if (url.searchParams.get('key') === ACCESS_KEY) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      // scrub the key from the URL (shareable links stay clean)
      url.searchParams.delete('key')
      window.history.replaceState({}, '', url.toString())
      return true
    }
  } catch { /* private mode etc. */ }
  return false
}

export function LaunchGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function tryUnlock(code: string) {
    if (code.trim().toLowerCase() === ACCESS_KEY) {
      try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
      onUnlock()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="app-dark fixed inset-0 z-[90] flex flex-col items-center justify-center bg-background px-6">
      {/* backdrop: faint grid + paper grain, same language as the site */}
      <div className="absolute inset-0 bg-dots opacity-[0.06]" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative w-full max-w-sm"
      >
        {/* brand */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative w-10 h-10 overflow-hidden ring-1 ring-vault/40">
            <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
          </div>
          <div className="leading-none text-left">
            <div className="font-display font-semibold text-lg tracking-tight">
              XELIS<span className="text-vault">Vault</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground mt-1">VaultLaunch</div>
          </div>
        </div>

        <div className="mt-8 border border-border bg-card/60 p-6">
          <motion.div
            animate={shake ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-vault">
              Private preview
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              This application is not public yet. Enter the access key to open
              the launchpad preview.
            </p>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault()
                tryUnlock(value)
              }}
            >
              <input
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="access key"
                autoFocus
                aria-label="Access key"
                className="w-full border border-border bg-background px-4 py-3 font-mono text-sm tracking-[0.12em] text-foreground placeholder:text-muted-foreground/85 focus:border-vault/60 focus:outline-none"
              />
              <button
                type="submit"
                className="group relative mt-4 w-full border border-vault/45 bg-vault/10 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-vault transition-colors hover:bg-vault/20"
              >
                <span aria-hidden className="absolute left-0 top-0 h-2 w-2 bg-vault transition-all duration-200 group-hover:h-3 group-hover:w-[3px]" />
                <span aria-hidden className="absolute right-0 top-0 h-2 w-2 bg-vault transition-all duration-200 group-hover:h-[3px] group-hover:w-3" />
                <span aria-hidden className="absolute bottom-0 left-0 h-2 w-2 bg-vault transition-all duration-200 group-hover:h-[3px] group-hover:w-3" />
                <span aria-hidden className="absolute bottom-0 right-0 h-2 w-2 bg-vault transition-all duration-200 group-hover:h-3 group-hover:w-[3px]" />
                Open the preview
              </button>
            </form>

            {shake && (
              <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                wrong key
              </div>
            )}
          </motion.div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/85 transition-colors hover:text-vault"
          >
            ← back to xelisvault.xyz
          </a>
        </div>
      </motion.div>
    </div>
  )
}
