import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PayPage } from '@/components/nerva/pay-page'

export const metadata: Metadata = {
  title: 'NervaLink · Checkout',
  description:
    'Pay in NERVA (XNV): scan the QR with your wallet, and this page watches the chain for your payment in real time. Stateless, keyless, private.',
}

export default function NervaPayPageRoute() {
  return (
    <Suspense fallback={
      <div className="pt-40 pb-40 flex items-center justify-center">
        <div className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em]">loading checkout…</div>
      </div>
    }>
      <PayPage />
    </Suspense>
  )
}
