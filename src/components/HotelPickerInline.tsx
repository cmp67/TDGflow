'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Building2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface HotelOption {
  id: string
  name: string
  location: string | null
}

/* Combobox de reassociação de contato a fornecedor — acha em "buscar
   fornecedor ou destino" (mesmo padrão de busca de HoteisView), escolhe,
   ou limpa o vínculo por completo (contato vira "avulso", ligado só por
   texto livre em organização). Achado da Carla (02/08): contato importado
   podia grudar no fornecedor errado (nome parecido, ex. "Vila Oyá" vs
   "Vila Joya") e não tinha como corrigir — só editar nome/e-mail. */
export default function HotelPickerInline({
  hotelId, hotelName, onChange,
}: {
  hotelId: string | null
  hotelName: string | null
  onChange: (hotelId: string | null, hotelName: string | null) => void
}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250).trim()
  const [options, setOptions] = useState<HotelOption[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!debouncedQuery) { setOptions([]); return }
    let cancelled = false
    // Reaproveita a busca cruzada da Fase 8 (grupo "hotéis") em vez de
    // adicionar suporte a `search` em /api/hotels, que hoje devolve sempre
    // o catálogo inteiro (656 fornecedores) sem filtro nenhum.
    fetch(`/api/search?search=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const rows = (data.hotels?.items ?? []) as { id: string; name: string; location: string | null }[]
        setOptions(rows.slice(0, 8).map(h => ({ id: h.id, name: h.name, location: h.location })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [debouncedQuery])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (hotelId) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
        border: '1px solid var(--tdgflow-border)', borderRadius: 8, background: 'var(--tdgflow-bg)',
      }}>
        <Building2 size={13} style={{ color: 'var(--tdgflow-navy-dim)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--tdgflow-text-primary)' }}>{hotelName ?? 'Fornecedor vinculado'}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          title="Remover vínculo com fornecedor"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <X size={13} style={{ color: 'var(--tdgflow-text-muted)' }} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
        <input
          className="input"
          placeholder="Vincular a um fornecedor (opcional)..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          style={{ paddingLeft: 28, fontSize: '0.8125rem' }}
        />
      </div>
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
          background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto',
        }}>
          {options.map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => { onChange(h.id, h.name); setQuery(''); setOptions([]); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem',
                color: 'var(--tdgflow-text-primary)', borderBottom: '1px solid var(--tdgflow-border-subtle)',
              }}
            >
              {h.name}
              {h.location && <span style={{ color: 'var(--tdgflow-text-muted)', fontSize: '0.6875rem' }}> · {h.location}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
