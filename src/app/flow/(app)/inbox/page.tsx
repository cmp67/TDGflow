'use client'

import SectionShell from '@/components/SectionShell'
import { Mail } from 'lucide-react'

export default function InboxPage() {
  return (
    <SectionShell
      title="Inbox"
      description="Emails recebidos — ofertas, contratos e novidades de parceiros"
      soon
      soonMessage="A integração com o email do TDG chegará em breve."
      icon={Mail}
    />
  )
}
