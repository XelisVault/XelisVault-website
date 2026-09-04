'use client'

/** Small shared pieces for the NERVA explorer UI. */

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        })
      }}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors shrink-0 ${className}`}
      aria-label="Copy"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>
}
