import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Explorer } from '@/components/nerva/explorer/explorer'

export const metadata: Metadata = {
  title: 'Live Explorer',
  description:
    'Live NERVA (XNV) network telemetry: blocks, transactions, mempool, difficulty and hashrate, streamed directly from the public explorer API in your browser.',
}

export default function NervaExplorerPage() {
  return (
    <Suspense fallback={
      <div className="pt-40 pb-40 flex items-center justify-center">
        <div className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em]">syncing explorer…</div>
      </div>
    }>
      <Explorer />
    </Suspense>
  )
}
