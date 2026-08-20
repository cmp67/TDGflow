'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/* Chip input com autocomplete pro vocabulário de tags do Acervo TDG
   (pedido da Carla, 20/08: "seria bom ter um sistema de tags que os
   usuários também pudessem usar"). Sugere as tags já existentes (a
   auto-classificação da importação já deixou um vocabulário limpo,
   kebab-case) conforme a pessoa digita — clicar numa sugestão ou apertar
   Enter vira chip. Não trava: se a tag não existir ainda, Enter cria uma
   nova mesmo assim — vocabulário converge por sugestão, não por bloqueio. */

interface TagOption { tag: string; count: number }

export default function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [allTags, setAllTags] = useState<TagOption[]>([])
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/knowledge-tips/tags')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tags) setAllTags(data.tags) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase()
    if (!normalized || value.includes(normalized)) { setInput(''); return }
    onChange([...value, normalized])
    setInput('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  const suggestions = input.trim()
    ? allTags.filter(t => t.tag.includes(input.trim().toLowerCase()) && !value.includes(t.tag)).slice(0, 6)
    : []

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        padding: '6px 8px', border: '1px solid var(--tdgflow-border)', borderRadius: 8, background: 'var(--tdgflow-surface)',
        minHeight: 34,
      }}>
        {value.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.6875rem', fontWeight: 600, padding: '2px 6px 2px 8px', borderRadius: 999,
            background: 'var(--tdgflow-gold-subtle)', color: 'var(--tdgflow-gold-dim)',
          }}>
            {tag}
            <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
            if (e.key === 'Backspace' && !input && value.length > 0) removeTag(value[value.length - 1])
          }}
          placeholder={value.length === 0 ? 'Tags — ex: blacklist, restaurantes' : 'Adicionar tag'}
          style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', flex: 1, minWidth: 100, background: 'transparent', color: 'var(--tdgflow-text-primary)' }}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
          background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <button
              key={s.tag}
              onClick={() => addTag(s.tag)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '7px 10px', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--tdgflow-text-primary)', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--tdgflow-surface-high)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span>{s.tag}</span>
              <span style={{ color: 'var(--tdgflow-text-muted)', fontSize: '0.6875rem' }}>{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
