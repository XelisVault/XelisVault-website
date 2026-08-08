'use client'

import { useState, useEffect } from 'react'
import { QuestOverlay } from './quest-overlay'

export function Quest() {
  const [open, setOpen] = useState(false)

  // Open via #quest hash
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#quest') {
        setOpen(true)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  // Clean hash on close
  const handleClose = () => {
    setOpen(false)
    if (window.location.hash === '#quest') {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  // Expose a global trigger (for logo click handler)
  useEffect(() => {
    ;(window as unknown as { __openQuest?: () => void }).__openQuest = () => setOpen(true)
    return () => {
      delete (window as unknown as { __openQuest?: () => void }).__openQuest
    }
  }, [])

  return <QuestOverlay open={open} onClose={handleClose} />
}
