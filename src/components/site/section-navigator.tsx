'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

const SECTIONS = [
  { id: 'top', label: 'Home' },
  { id: 'protocol', label: 'Protocol' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'products', label: 'Products' },
  { id: 'mining', label: 'Mining' },
  { id: 'vaultchat', label: 'VaultChat' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'roadmap', label: 'Roadmap' },
]

export function SectionNavigator() {
  const [activeSection, setActiveSection] = useState('top')
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 800)

      // Find active section
      const scrollPos = window.scrollY + window.innerHeight / 3
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id)
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(SECTIONS[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      {/* Floating dot navigator - right side, desktop only */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-3">
        {SECTIONS.map((s) => {
          const isActive = activeSection === s.id
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="group flex items-center gap-2"
              aria-label={s.label}
            >
              <span className={`text-[10px] font-mono uppercase tracking-wider transition-all ${
                isActive ? 'text-vault opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-60'
              }`}>
                {s.label}
              </span>
              <span className={`block rounded-full transition-all ${
                isActive
                  ? 'w-2.5 h-2.5 bg-vault '
                  : 'w-1.5 h-1.5 bg-foreground/35 group-hover:bg-vault/60'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-none bg-vault text-white flex items-center justify-center shadow-lg hover:bg-vault/85 transition-all hover:"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
