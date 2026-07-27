'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader, Save, CheckCircle } from 'lucide-react'

interface Brand {
  logoUrl:        string | null
  primaryColor:   string | null
  secondaryColor: string | null
  footerText:     string | null
}

const EMPTY: Brand = { logoUrl: null, primaryColor: null, secondaryColor: null, footerText: null }

/* Ícone próprio (paleta) — nunca emoji/ícone genérico, regra do design
   system Bemgsy. Mesmo traço/pontas arredondadas do resto do app. */
function PaletteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C7 3 3 7 3 12c0 4 3 7 6.5 7 .8 0 1.5-.6 1.5-1.5 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H14c3.9 0 7-3.1 7-7 0-2.8-4-4-9-4z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

interface Props {
  userRole: string
}

export default function BrandSettings({ userRole }: Props) {
  const canEdit = userRole === 'admin' || userRole === 'agency_admin'
  const fileRef = useRef<HTMLInputElement>(null)

  const [brand, setBrand]         = useState<Brand>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch('/api/brand')
      .then(r => r.json())
      .then(json => { if (json.brand) setBrand(json.brand) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(field: keyof Brand, value: string) {
    setBrand(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor:   brand.primaryColor || null,
          secondaryColor: brand.secondaryColor || null,
          footerText:     brand.footerText || null,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setBrand(json.brand)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(json.error ?? 'Não foi possível salvar.')
      }
    } catch {
      setError('Não foi possível conectar ao servidor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/brand/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        setBrand(prev => ({ ...prev, logoUrl: json.logo_url }))
      } else {
        setError(json.error ?? 'Não foi possível enviar o logo.')
      }
    } catch {
      setError('Não foi possível conectar ao servidor.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return null
  if (!canEdit && !brand.logoUrl && !brand.primaryColor) return null

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--tdgflow-navy)' }}><PaletteIcon /></span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>DNA de marca da agência</h3>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', margin: 0 }}>
        Logo e cor de destaque da sua agência — a navegação e o comportamento do TDG Flow continuam iguais pra todo mundo, só a pele muda.
      </p>

      {!canEdit ? (
        <div className="flex items-center gap-3">
          {brand.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={brand.logoUrl} alt="Logo da agência" style={{ maxHeight: 32, maxWidth: 140, objectFit: 'contain' }} />
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>Configurado pelo administrador da agência.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={brand.logoUrl} alt="Logo da agência" style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--tdgflow-border)', borderRadius: 8, padding: 6 }} />
            ) : (
              <div style={{ width: 64, height: 40, borderRadius: 8, border: '1.5px dashed var(--tdgflow-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tdgflow-text-faint)' }}>
                <PaletteIcon size={16} />
              </div>
            )}
            <label style={{ cursor: uploading ? 'default' : 'pointer' }}>
              <span className="btn-ghost" style={{ padding: '7px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {uploading ? <Loader size={12} className="animate-spin" /> : null}
                {uploading ? 'Enviando…' : brand.logoUrl ? 'Trocar logo' : 'Enviar logo'}
              </span>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'block', marginBottom: 4 }}>Cor de destaque primária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.primaryColor || '#A87C4F'} onChange={e => set('primaryColor', e.target.value)} style={{ width: 32, height: 32, padding: 0, border: '1px solid var(--tdgflow-border)', borderRadius: 6, cursor: 'pointer' }} />
                <input className="input" value={brand.primaryColor ?? ''} onChange={e => set('primaryColor', e.target.value)} placeholder="#A87C4F" style={{ fontSize: '0.75rem' }} />
              </div>
            </div>
            <div className="flex-1">
              <label style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'block', marginBottom: 4 }}>Cor de destaque secundária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.secondaryColor || '#C15A34'} onChange={e => set('secondaryColor', e.target.value)} style={{ width: 32, height: 32, padding: 0, border: '1px solid var(--tdgflow-border)', borderRadius: 6, cursor: 'pointer' }} />
                <input className="input" value={brand.secondaryColor ?? ''} onChange={e => set('secondaryColor', e.target.value)} placeholder="#C15A34" style={{ fontSize: '0.75rem' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'block', marginBottom: 4 }}>Texto do rodapé (opcional)</label>
            <input className="input" value={brand.footerText ?? ''} onChange={e => set('footerText', e.target.value)} placeholder="Ex: Sua Agência — powered by TDG Flow" style={{ fontSize: '0.8125rem' }} />
          </div>

          {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', margin: 0 }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ padding: '9px 14px', fontSize: '0.8125rem' }}>
            {saving ? <Loader size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? 'Salvo!' : 'Salvar marca'}
          </button>
        </>
      )}
    </div>
  )
}
