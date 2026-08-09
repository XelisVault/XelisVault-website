import type { Metadata } from 'next'
import { CommunityPage } from '@/components/pages/community'

export const metadata: Metadata = {
  title: 'Community — XELIS Vault',
  description:
    'Join the XELIS Vault community on Discord, Twitter, and GitHub. Apply for grants, showcase your project, and help build the future of confidential finance.',
}

export default function Page() {
  return <CommunityPage />
}
