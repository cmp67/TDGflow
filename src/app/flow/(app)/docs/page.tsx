import SectionShell from '@/components/SectionShell'
import { FileText } from 'lucide-react'

export default function DocsPage() {
  return (
    <SectionShell
      title="Documentação"
      description="Contratos, fichas técnicas, políticas e materiais de treinamento"
      icon={FileText}
    />
  )
}
