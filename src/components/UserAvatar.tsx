'use client'

import { useRef, useState } from 'react'
import { Loader2, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  name: string
  avatarUrl?: string | null
  size?: number
  editable?: boolean   // show upload on hover
}

export default function UserAvatar({ name, avatarUrl: initialUrl, size = 28, editable = false }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [hover, setHover] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const initial = (name || 'A')[0].toUpperCase()
  const fontSize = Math.round(size * 0.38)

  async function handleFile(file: File) {
    // Immediate optimistic preview
    const preview = URL.createObjectURL(file)
    setUrl(preview)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/users/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.avatar_url) {
        setUrl(data.avatar_url)
        router.refresh()
      }
    } catch { /* keep preview */ }

    setUploading(false)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        onClick={() => editable && fileRef.current?.click()}
        onMouseEnter={() => editable && setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: size, height: size, borderRadius: '50%',
          overflow: 'hidden', flexShrink: 0,
          background: url ? 'transparent' : 'var(--surface-high)',
          border: `1px solid ${hover && editable ? 'var(--gold)' : 'var(--border-light)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize, fontWeight: 600, color: 'var(--text-secondary)',
          cursor: editable ? 'pointer' : 'default',
          transition: 'border-color 150ms',
          position: 'relative',
        }}
      >
        {url ? (
          <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ userSelect: 'none' }}>{initial}</span>
        )}

        {/* Hover overlay — camera icon */}
        {editable && hover && !uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={Math.round(size * 0.35)} style={{ color: 'var(--surface)' }} />
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Loader2 size={Math.round(size * 0.38)} className="animate-spin" style={{ color: 'var(--surface)' }} />
          </div>
        )}
      </div>

      {editable && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      )}
    </div>
  )
}
