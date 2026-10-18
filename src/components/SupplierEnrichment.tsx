'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import type { PlaceProposal } from '@/lib/places'
import { ENRICH_FIELDS, type EnrichField, type EnrichmentStatus } from '@/lib/enrichment'

/* Dados públicos encontrados pro card (Google Places), com revisão de quem
   criou o card (ou admin) — pedido da Carla 16/10/2026: "a pessoa que criou
   o contato precisa revisar e aprovar". Nada entra sem clique. */

export type EnrichmentState = { status: EnrichmentStatus | null; proposal: PlaceProposal | null; canReview: boolean; current: { image_url: string; location: string; website_url: string | null; contact_phone: string; country: string } }

const FIELD_LABEL: Record<EnrichField, (p: PlaceProposal) => string | null> = {
  image_url: p => p.image_url ? 'Foto' : null,
  location: p => p.address ? `Endereço: ${p.address}` : null,
  website_url: p => p.website ? `Site: ${p.website}` : null,
  contact_phone: p => p.phone ? `Telefone: ${p.phone}` : null,
  country: p => p.country ? `País: ${p.country}` : null,
}

export default function SupplierEnrichment({ hotelId, state, onChanged }: { hotelId: string; state: EnrichmentState; onChanged: () => void }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<Set<EnrichField>>(() => new Set(ENRICH_FIELDS))

  async function search() {
    setBusy(true)
    try {
      const res = await fetch(`/api/hotels/${hotelId}/enrich`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      toast(data.status === 'pending' ? 'Dados encontrados — revise abaixo' : 'Nada encontrado no Google para este nome', data.status === 'pending' ? 'success' : 'error')
      onChanged()
    } catch (err) { toast(err instanceof Error ? err.message : 'Não deu pra buscar', 'error') }
    finally { setBusy(false) }
  }

  async function review(action: 'approve' | 'reject') {
    setBusy(true)
    try {
      const res = await fetch(`/api/hotels/${hotelId}/enrich`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, fields: [...chosen] }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      toast(action === 'approve' ? 'Card atualizado' : 'Proposta descartada', 'success')
      onChanged()
    } catch (err) { toast(err instanceof Error ? err.message : 'Não deu pra salvar', 'error') }
    finally { setBusy(false) }
  }

  const p = state.proposal
  const pending = state.status === 'pending' && p

  if (!pending) {
    const missing = !state.current.image_url || !state.current.location || !state.current.website_url
    if (!missing) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={search} disabled={busy} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {state.status === 'not_found' ? 'Buscar dados públicos de novo' : 'Buscar foto, endereço e site'}
        </button>
      </div>
    )
  }

  const available = ENRICH_FIELDS.filter(f => FIELD_LABEL[f](p))
  return (
    <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--tdgflow-gold-dim)', background: 'var(--tdgflow-gold-subtle)' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tdgflow-gold-dim)', marginBottom: 8 }}>Dados públicos encontrados (Google)</p>
      {p.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
      )}
      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', marginBottom: 6 }}>{p.name}{p.maps_url && <a href={p.maps_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontSize: '0.6875rem', fontWeight: 400, color: 'var(--tdgflow-navy)' }}>ver no mapa</a>}</p>
      {state.canReview ? (
        <>
          {available.map(f => (
            <label key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={chosen.has(f)} onChange={e => { const n = new Set(chosen); if (e.target.checked) n.add(f); else n.delete(f); setChosen(n) }} style={{ marginTop: 3 }} />
              <span>{FIELD_LABEL[f](p)}{f === 'country' && state.current.country ? ` (o card já tem "${state.current.country}", mantido)` : ''}</span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" disabled={busy || chosen.size === 0} onClick={() => review('approve')} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>{busy ? 'Salvando…' : 'Aprovar selecionados'}</button>
            <button type="button" disabled={busy} onClick={() => review('reject')} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Descartar</button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>Aguardando quem criou o card (ou o admin) revisar: {available.map(f => FIELD_LABEL[f](p)?.split(':')[0]).join(', ').toLowerCase()}.</p>
      )}
    </div>
  )
}
