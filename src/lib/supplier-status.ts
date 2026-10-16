/* Selo de confiança do card do fornecedor (função pura — vale no navegador).

   Três status (porte do Trip Flow, decisão da Carla 16/10/2026): o Flow não
   é catálogo, então todo card diz em que confiar.
   - Testado pela rede (dourado): alguém da rede esteve lá e deixou o relato.
   - Aprovado por cliente (azul): a consultora vendeu, o cliente voltou
     satisfeito, mas ninguém da rede foi. É feedback, não inspeção.
   - Aguardando teste (coral): conhecido em feira, reunião ou indicação.
   Precedência num lugar só: fechado > reforma > testado > aprovado >
   descoberto. Hotel testado que fechou continua fechado. Sem nada a dizer,
   o card fica sem selo — nunca uma cor "neutra" que ninguém decoraria. */

import { OPERATIONAL_STATUS_SHORT, type OperationalStatus } from '@/lib/supplier-operational'

export type SupplierStatusInput = {
  testedCount: number
  pendingLeadCount: number
  clientApprovedCount?: number
  operationalStatus?: OperationalStatus | null
}

export type SupplierStatusVariant = 'fechado' | 'reforma' | 'testado' | 'aprovado' | 'descoberto'

export type SupplierStatusBadge = {
  variant: SupplierStatusVariant
  icon: string
  label: string
  color: string
  bg: string
  border: string
}

export const TRUST_LABELS = {
  testado: 'Testado pela rede',
  aprovado: 'Aprovado por cliente',
  descoberto: 'Aguardando teste',
} as const

const BADGES: Record<SupplierStatusVariant, SupplierStatusBadge> = {
  fechado: {
    variant: 'fechado', icon: '', label: OPERATIONAL_STATUS_SHORT.fechado,
    color: 'var(--tdgflow-text-secondary)', bg: 'var(--tdgflow-surface-high)', border: 'var(--tdgflow-border)',
  },
  reforma: {
    variant: 'reforma', icon: 'i-calendar', label: OPERATIONAL_STATUS_SHORT.reforma,
    color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', border: 'var(--tdgflow-accent-warm)',
  },
  testado: {
    variant: 'testado', icon: 'i-verified', label: TRUST_LABELS.testado,
    color: 'var(--tdgflow-gold-dim)', bg: 'var(--tdgflow-gold-subtle)', border: 'var(--tdgflow-gold-dim)',
  },
  aprovado: {
    variant: 'aprovado', icon: 'i-client', label: TRUST_LABELS.aprovado,
    color: 'var(--tdgflow-accent-info)', bg: 'var(--tdgflow-accent-info-subtle)', border: 'var(--tdgflow-accent-info)',
  },
  descoberto: {
    variant: 'descoberto', icon: 'i-spark', label: TRUST_LABELS.descoberto,
    color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', border: 'var(--tdgflow-accent-warm)',
  },
}

export function supplierStatus(hotel: SupplierStatusInput): SupplierStatusBadge | null {
  if (hotel.operationalStatus === 'fechado') return BADGES.fechado
  if (hotel.operationalStatus === 'reforma') return BADGES.reforma
  if (hotel.testedCount > 0) return BADGES.testado
  if ((hotel.clientApprovedCount ?? 0) > 0) return BADGES.aprovado
  if (hotel.pendingLeadCount > 0) return BADGES.descoberto
  return null
}
