import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LinkCreator } from '@/components/nerva/link-creator'

export const metadata: Metadata = {
  title: 'NervaLink · Payment Links',
  description:
    'Create NERVA (XNV) payment links in seconds — stateless, keyless, serverless. The invoice lives in the URL; detection watches the chain from your browser.',
}

export default function NervaLinkPage() {
  return (
    <Suspense fallback={
      <div className="pt-40 pb-40 flex items-center justify-center">
        <div className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em]">loading NervaLink…</div>
      </div>
    }>
      <LinkCreator />
    </Suspense>
  )
}
