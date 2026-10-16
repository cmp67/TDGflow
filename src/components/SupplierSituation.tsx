'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import {
  OPERATIONAL_STATUS_LABELS, reopeningOverdue, todayIso, type OperationalStatus,
} from '@/lib/supplier-operational'

/* Situação do fornecedor na ficha (porte do Trip Flow, 16/10/2026):
   estado operacional (em operação / reforma com data prevista / fechado com
   motivo) e blacklist manual com motivo obrigatório. Qualquer pessoa logada
   da rede marca — não é edição de cadastro, é aviso à rede, sempre com
   motivo e trilha de auditoria no servidor. */

export type SituationFields = {
  isBlacklisted: boolean
  blacklistReason: string | null
  operationalStatus: OperationalStatus
  operationalNote: string | null
  reopeningExpected: string | null
}

type Props = { hotelId: string; value: SituationFields; onChange: (next: SituationFields) => void }

function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const label: React.CSSProperties = {
  display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const textarea: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1px solid var(--tdgflow-border)', padding: '8px 10px',
  fontSize: '0.8125rem', resize: 'vertical', marginBottom: 8,
}

async function patchHotel(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/hotels', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok || !data.hotel) throw new Error(data.error ?? 'Não foi possível salvar')
  return data.hotel as Record<string, unknown>
}

export default function SupplierSituation({ hotelId, value, onChange }: Props) {
  const { toast } = useToast()
  const [showOperational, setShowOperational] = useState(false)
  const [draftStatus, setDraftStatus] = useState<Exclude<OperationalStatus, 'ativo'>>('reforma')
  const [note, setNote] = useState(value.operationalNote ?? '')
  const [reopening, setReopening] = useState(value.reopeningExpected ?? '')
  const [showBlacklist, setShowBlacklist] = useState(false)
  const [reason, setReason] = useState(value.blacklistReason ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveOperational(status: OperationalStatus) {
    setSaving(true); setError(null)
    try {
      const h = await patchHotel({ id: hotelId, operational_status: status, operational_note: note.trim() || null, reopening_expected: status === 'reforma' ? (reopening || null) : null })
      onChange({ ...value, operationalStatus: h.operational_status as OperationalStatus, operationalNote: (h.operational_note as string | null) ?? null, reopeningExpected: (h.reopening_expected as string | null) ?? null })
      setShowOperational(false)
      toast(status === 'ativo' ? 'Fornecedor de volta em operação' : 'Situação registrada', 'success')
    } catch (err) { setError(err instanceof Error ? err.message : 'Serviço indisponível.') }
    finally { setSaving(false) }
  }

  async function saveBlacklist(flag: boolean) {
    if (flag && !reason.trim()) { setError('Descreva o que aconteceu antes de marcar como blacklist.'); return }
    setSaving(true); setError(null)
    try {
      const h = await patchHotel({ id: hotelId, is_blacklisted: flag, blacklist_reason: flag ? reason.trim() : null })
      onChange({ ...value, isBlacklisted: h.is_blacklisted as boolean, blacklistReason: (h.blacklist_reason as string | null) ?? null })
      setShowBlacklist(false)
      toast(flag ? 'Marcado como blacklist' : 'Retirado da blacklist', 'success')
    } catch (err) { setError(err instanceof Error ? err.message : 'Serviço indisponível.') }
    finally { setSaving(false) }
  }

  const overdue = reopeningOverdue(value.operationalStatus, value.reopeningExpected, todayIso())
  const closed = value.operationalStatus === 'fechado'

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 10 }}>
        Situação do fornecedor
      </p>

      {/* Blacklist */}
      {value.isBlacklisted && !showBlacklist && (
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 10, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B91C1C', marginBottom: 6 }}>⛔ Blacklist</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>&ldquo;{value.blacklistReason}&rdquo;</p>
          <button type="button" disabled={saving} onClick={() => void saveBlacklist(false)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', marginTop: 8 }}>
            Retirar da blacklist
          </button>
        </div>
      )}

      {/* Estado operacional atual */}
      {value.operationalStatus !== 'ativo' && !showOperational && (
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 10,
          background: closed ? 'var(--tdgflow-surface-high)' : 'var(--tdgflow-accent-warm-subtle)',
          border: `1px solid ${closed ? 'var(--tdgflow-border)' : 'var(--tdgflow-accent-warm)'}`,
        }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: closed ? 'var(--tdgflow-text-secondary)' : 'var(--tdgflow-accent-warm)', marginBottom: 6 }}>
            {OPERATIONAL_STATUS_LABELS[value.operationalStatus]}
          </p>
          {value.operationalStatus === 'reforma' && value.reopeningExpected && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', margin: 0 }}>
              Reabertura prevista: {formatIsoDate(value.reopeningExpected)}
              {overdue && <span style={{ marginLeft: 8, color: 'var(--tdgflow-accent-warm)', fontWeight: 600 }}>— previsão vencida, confirme com o hotel</span>}
            </p>
          )}
          {value.operationalNote && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, margin: '6px 0 0', fontStyle: 'italic' }}>&ldquo;{value.operationalNote}&rdquo;</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" disabled={saving} onClick={() => void saveOperational('ativo')} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              Voltou a operar
            </button>
            <button type="button" onClick={() => { setDraftStatus(value.operationalStatus as 'reforma' | 'fechado'); setShowOperational(true) }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              Alterar
            </button>
          </div>
        </div>
      )}

      {/* Formulário: estado operacional */}
      {showOperational && (
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 10, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)' }}>
          <label style={label}>Situação</label>
          <select className="input" value={draftStatus} onChange={e => setDraftStatus(e.target.value as 'reforma' | 'fechado')} style={{ fontSize: '0.8125rem', marginBottom: 8 }}>
            <option value="reforma">{OPERATIONAL_STATUS_LABELS.reforma}</option>
            <option value="fechado">{OPERATIONAL_STATUS_LABELS.fechado}</option>
          </select>
          {draftStatus === 'reforma' && (
            <label style={label}>
              Reabertura prevista
              <input className="input" type="date" min={todayIso()} value={reopening} onChange={e => setReopening(e.target.value)} style={{ display: 'block', fontSize: '0.8125rem', marginTop: 4, textTransform: 'none', letterSpacing: 0 }} />
            </label>
          )}
          <label style={label}>{draftStatus === 'fechado' ? 'O que aconteceu?' : 'Observação (opcional)'}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={textarea}
            placeholder={draftStatus === 'fechado' ? 'Fechou, foi vendido, mudou de bandeira?' : 'Ex: reforma das áreas comuns, piscina fechada'} />
          {error && <p style={{ fontSize: '0.75rem', color: '#B91C1C', marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={saving} onClick={() => void saveOperational(draftStatus)} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" onClick={() => { setShowOperational(false); setError(null) }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Formulário: blacklist */}
      {showBlacklist && (
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 10, border: '1px solid #FCA5A5', background: '#FEF2F2' }}>
          <label style={label}>O que aconteceu?</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={textarea} placeholder="Descreva o ocorrido — é obrigatório e fica visível pra rede inteira." />
          {error && <p style={{ fontSize: '0.75rem', color: '#B91C1C', marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={saving} onClick={() => void saveBlacklist(true)} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>{saving ? 'Salvando…' : 'Marcar blacklist'}</button>
            <button type="button" onClick={() => { setShowBlacklist(false); setError(null) }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Ações */}
      {!showOperational && !showBlacklist && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {value.operationalStatus === 'ativo' && (
            <button type="button" onClick={() => { setDraftStatus('reforma'); setShowOperational(true) }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
              Fechou ou está em reforma?
            </button>
          )}
          {!value.isBlacklisted && (
            <button type="button" onClick={() => setShowBlacklist(true)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#B91C1C' }}>
              Marcar blacklist
            </button>
          )}
        </div>
      )}
    </div>
  )
}
