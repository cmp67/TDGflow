'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, FileText, Link, Video, Lightbulb, StickyNote, ExternalLink } from 'lucide-react'

interface Hotel { id: string; name: string }
interface KnowledgeItem {
  id: string
  hotel_id: string
  type: 'fact' | 'pdf' | 'link' | 'video' | 'note'
  title: string
  content?: string
  url?: string
  created_at: string
}

const TYPE_CONFIG = {
  fact:  { label: 'Facto',  icon: Lightbulb, color: 'text-amber-600 bg-amber-50',  placeholder: 'Ex: Comissão base 10%, membro Virtuoso desde 2018' },
  note:  { label: 'Nota',   icon: StickyNote, color: 'text-blue-600 bg-blue-50',   placeholder: 'Ex: Pedir sempre pelo Carlos na reservas, mencionar TDG' },
  link:  { label: 'Link',   icon: Link,       color: 'text-purple-600 bg-purple-50', placeholder: 'https://...' },
  pdf:   { label: 'PDF',    icon: FileText,   color: 'text-red-600 bg-red-50',     placeholder: '' },
  video: { label: 'Vídeo',  icon: Video,      color: 'text-green-600 bg-green-50', placeholder: 'https://...' },
}

export default function KnowledgeAdmin() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [type, setType] = useState<KnowledgeItem['type']>('fact')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/knowledge').then(r => r.json()).then(d => {
      setHotels(d.hotels)
      if (d.hotels.length) setSelectedHotel(d.hotels[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedHotel) return
    setLoading(true)
    fetch(`/api/knowledge?hotel_id=${selectedHotel}`)
      .then(r => r.json())
      .then(d => { setItems(d.items); setLoading(false) })
  }, [selectedHotel])

  async function handleAdd() {
    if (!title.trim() || !selectedHotel) return
    setSaving(true)

    if (type === 'pdf' || type === 'video' && file) {
      const fd = new FormData()
      fd.append('hotel_id', selectedHotel)
      fd.append('title', title)
      fd.append('file', file!)
      const res = await fetch('/api/knowledge', { method: 'POST', body: fd })
      const d = await res.json()
      setItems(prev => [d.item, ...prev])
    } else {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel_id: selectedHotel, type, title, content: content || null, url: url || null })
      })
      const d = await res.json()
      setItems(prev => [d.item, ...prev])
    }

    setTitle(''); setContent(''); setUrl(''); setFile(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/knowledge', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const selectedHotelName = hotels.find(h => h.id === selectedHotel)?.name ?? ''
  const cfg = TYPE_CONFIG[type]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">TDG</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Base de Conhecimento</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">Informação verificada que o assistente usa para responder. Nada é inventado.</p>
        </div>

        {/* Hotel selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Hotel</label>
          <select
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            value={selectedHotel}
            onChange={e => setSelectedHotel(e.target.value)}
          >
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        {/* Add form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Adicionar informação</p>

          {/* Type selector */}
          <div className="flex gap-2 flex-wrap mb-4">
            {(Object.keys(TYPE_CONFIG) as KnowledgeItem['type'][]).map(t => {
              const c = TYPE_CONFIG[t]
              const Icon = c.icon
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    type === t ? c.color + ' border-current' : 'text-gray-500 bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={13} />
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* Title */}
          <input
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
            placeholder="Título (ex: Comissão base, Ficha técnica, Vídeo overview...)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {/* Content by type */}
          {(type === 'fact' || type === 'note') && (
            <textarea
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              rows={3}
              placeholder={cfg.placeholder}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          )}

          {(type === 'link' || type === 'video') && (
            <input
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={cfg.placeholder}
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          )}

          {type === 'pdf' && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              {file
                ? <p className="text-sm text-gray-700 font-medium">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>
                : <p className="text-sm text-gray-400">Clique para seleccionar PDF</p>
              }
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={saving || !title.trim() || (type === 'pdf' && !file)}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            {saving ? 'A guardar...' : `Adicionar ${cfg.label}`}
          </button>
        </div>

        {/* Knowledge list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
            {selectedHotelName} — {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>

          {loading && <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">A carregar...</div>}

          {!loading && items.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              Nenhuma informação adicionada. O assistente usa apenas o que estiver aqui.
            </div>
          )}

          {items.map(item => {
            const c = TYPE_CONFIG[item.type]
            const Icon = c.icon
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  {item.content && <p className="text-sm text-gray-600 mt-0.5">{item.content}</p>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-amber-600 hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink size={11} />
                      {item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}
                    </a>
                  )}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
