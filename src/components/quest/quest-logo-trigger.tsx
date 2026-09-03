'use client'

import { useRef } from 'react'

export function QuestLogoTrigger() {
  const clickCount = useRef(0)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = () => {
    clickCount.current += 1

    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 2000)

    if (clickCount.current >= 7) {
      clickCount.current = 0
      const w = window as unknown as { __openQuest?: () => void }
      w.__openQuest?.()
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Xelis Vault"
      className="w-9 h-9 rounded-[3px] overflow-hidden ring-1 ring-vault/40 hover:ring-vault/70 transition-all cursor-pointer block"
      title=""
    >
      <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
    </button>
  )
}
