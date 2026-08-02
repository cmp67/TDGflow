'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import HotelPickerInline from '@/components/HotelPickerInline'

export interface EditableContact {
  id: string
  hotel_id: string | null
  name: string
  surname: string
  category?: string | null
  organization?: string | null
  whatsapp?: string | null
  email?: string | null
  notes?: string | null
}

const PERSON_CATEGORIES = [
  { key: 'guia',       label: 'Guia / DMC' },
  { key: 'operadora',  label: 'Operadora' },
  { key: 'transfer',   label: 'Transfer' },
  { key: 'aérea',      label: 'Aérea' },
  { key: 'serviço',    label: 'Serviço' },
  { key: 'hospedagem', label: 'Hospedagem' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'jurídico',   label: 'Jurídico' },
  { key: 'tradução',   label: 'Tradução' },
  { key: 'médico',     label: 'Médico' },
]

/* Formulário de edição de contato — compartilhado entre a lente Contatos
   (ContatosLensView) e a ficha do fornecedor (HoteisView), pra não duplicar.
   Fase 8c (02/08): ganhou o seletor de fornecedor — antes um contato
   vinculado ao hotel errado (achado da Carla: "Vila Oyá" grudado em "Vila
   Joya" por nome parecido) não tinha como ser corrigido, só editar
   nome/e-mail. Trocar o vínculo aqui reabre organização/categoria como
   texto livre quando desvinculado. */
export default function ContactEditForm({ contact, onSaved, onCancel }: {
  contact: EditableContact
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(contact.name)
  const [surname, setSurname] = useState(contact.surname)
  const [category, setCategory] = useState(contact.category || PERSON_CATEGORIES[0].key)
  const [organization, setOrganization] = useState(contact.organization ?? '')
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp ?? '')
  const [email, setEmail] = useState(contact.email ?? '')
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [hotelId, setHotelId] = useState(contact.hotel_id)
  const [hotelName, setHotelName] = useState<string | null>(contact.hotel_id ? (contact.organization ?? null) : null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categoryIsAutomatic = !!hotelId

  function handleHotelChange(newHotelId: string | null, newHotelName: string | null) {
    setHotelId(newHotelId)
    setHotelName(newHotelName)
    if (!newHotelId) { setCategory(PERSON_CATEGORIES[0].key); setOrganization('') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!name.trim() || !surname.trim()) { setError('Nome e sobrenome são obrigatórios.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/hotel-contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: contact.id, name: name.trim(), surname: surname.trim(),
        hotelId,
        category: categoryIsAutomatic ? 'hotel' : category,
        organization: categoryIsAutomatic ? (hotelName ?? (organization.trim() || null)) : (organization.trim() || null),
        whatsapp: whatsapp.trim() || null, email: email.trim() || null, notes: notes.trim() || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erro ao salvar.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSaved()
  }

  return (
    <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
        <input className="input" placeholder="Sobrenome" value={surname} onChange={e => setSurname(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
      </div>
      <HotelPickerInline hotelId={hotelId} hotelName={hotelName} onChange={handleHotelChange} />
      {!categoryIsAutomatic && (
        <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ fontSize: '0.8125rem' }}>
          {PERSON_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      )}
      {!categoryIsAutomatic && (
        <input className="input" placeholder="Organização" value={organization} onChange={e => setOrganization(e.target.value)} style={{ fontSize: '0.8125rem' }} />
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
        <input className="input" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
      </div>
      <textarea className="input" placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />
      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>
          <AlertCircle size={13} /> {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={submitting} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '7px 12px', flex: 1 }}>
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} style={{ fontSize: '0.8125rem', padding: '7px 12px', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', borderRadius: 8, color: 'var(--tdgflow-text-muted)', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
