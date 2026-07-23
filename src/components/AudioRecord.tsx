'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Upload, X, Square, Circle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '@/lib/sounds'

type InputMode = 'record' | 'upload'

interface Props {
  defaultAgentName?: string
  onSaved: () => void
  onClose: () => void
}

export default function AudioRecord({ defaultAgentName = '', onSaved, onClose }: Props) {
  const [mode, setMode] = useState<InputMode>('record')
  const [agentName, setAgentName] = useState(defaultAgentName)
  const [interlocutorName, setInterlocutorName] = useState('')
  const [interlocutorCompany, setInterlocutorCompany] = useState('')

  const [recording, setRecording] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
  }

  function formatSeconds(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'mp4'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedFile(new File([blob], `gravacao-${Date.now()}.${ext}`, { type: mimeType }))
        setRecording(false)
        setStopping(false)
        sounds.recordStop()
      }
      mr.start(100)
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordingSeconds(0)
      sounds.recordStart()
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      sounds.error()
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    setStopping(true)
    mediaRecorderRef.current?.requestData()
    mediaRecorderRef.current?.stop()
  }

  const activeFile = mode === 'record' ? recordedFile : uploadFile

  async function handleSave() {
    if (!activeFile) return
    setSaving(true)
    const fd = new FormData()
    fd.append('audio', activeFile)
    fd.append('agent_name', agentName || 'Stella')
    fd.append('interlocutor_name', interlocutorName)
    fd.append('interlocutor_company', interlocutorCompany)
    await fetch('/api/audio-save', { method: 'POST', body: fd })
    setSaving(false)
    setSaved(true)
    sounds.saved()
    onSaved()
  }

  function handleNewRecording() {
    setSaved(false)
    setRecordedFile(null)
    setUploadFile(null)
    setRecordingSeconds(0)
    setInterlocutorName('')
    setInterlocutorCompany('')
  }

  const overlay = (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    />
  )

  if (saved) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-2xl p-8 text-center space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(134,239,172,0.10)' }}
          >
            <CheckCircle size={32} style={{ color: '#2E7D4F' }} />
          </div>
          <p className="font-semibold" style={{ color: '#112630' }}>Áudio salvo</p>
          <p className="text-sm" style={{ color: '#4A7580' }}>
            Você pode transcrever depois na fila de áudios.
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={handleNewRecording} className="btn-gold flex-1" style={{ justifyContent: 'center' }}>
              Gravar próxima reunião
            </button>
            <button onClick={onClose} className="btn-ghost flex-1" style={{ justifyContent: 'center' }}>
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: '#112630' }}>Registrar Reunião</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px', border: 'none' }}>
            <X size={18} style={{ color: '#4A7580' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Participants */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#4A7580' }}>
                Agente
              </label>
              <input
                className="input"
                placeholder="Seu nome"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#4A7580' }}>
                  Interlocutor
                </label>
                <input
                  className="input"
                  placeholder="Nome"
                  value={interlocutorName}
                  onChange={e => setInterlocutorName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: '#4A7580' }}>
                  Empresa
                </label>
                <input
                  className="input"
                  placeholder="Hotel / Empresa"
                  value={interlocutorCompany}
                  onChange={e => setInterlocutorCompany(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'var(--surface-high)' }}
          >
            {(['record', 'upload'] as InputMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  mode === m
                    ? { background: 'var(--surface)', color: '#112630', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                    : { color: '#4A7580' }
                }
              >
                {m === 'record' ? <><Mic size={14} /> Gravar</> : <><Upload size={14} /> Enviar arquivo</>}
              </button>
            ))}
          </div>

          {/* Record */}
          <AnimatePresence mode="wait">
            {mode === 'record' && (
              <motion.div
                key="record-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl p-6 text-center space-y-3"
                style={{ border: '1px dashed var(--border-light)', background: 'var(--surface-high)' }}
              >
                {!recording && !stopping && !recordedFile && (
                  <>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'var(--gold-subtle)' }}
                    >
                      <Mic size={24} style={{ color: '#008C94' }} />
                    </div>
                    <button onClick={startRecording} className="btn-gold mx-auto">
                      <Circle size={12} className="fill-current" /> Iniciar gravação
                    </button>
                  </>
                )}

                {recording && !stopping && (() => {
                  const MAX = 20 * 60
                  const pct = Math.min((recordingSeconds / MAX) * 100, 100)
                  const warn = recordingSeconds >= 15 * 60
                  const crit = recordingSeconds >= 19 * 60
                  return (
                    <>
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto recording-ring"
                        style={{ background: 'rgba(248,113,113,0.10)' }}
                      >
                        <Mic size={24} style={{ color: '#C0392B' }} />
                      </div>
                      <p
                        className="text-2xl font-mono font-semibold"
                        style={{ color: crit ? '#C0392B' : '#112630', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatSeconds(recordingSeconds)}
                      </p>
                      <div className="w-full space-y-1.5">
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: crit ? 'var(--error)' : warn ? 'var(--warning)' : 'var(--success)',
                              width: `${pct}%`,
                            }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                        {crit && (
                          <p className="text-xs font-medium animate-pulse" style={{ color: '#C0392B' }}>
                            Limite quase atingido — pare agora!
                          </p>
                        )}
                        {warn && !crit && (
                          <p className="text-xs" style={{ color: '#B6410F' }}>Menos de 5 min restantes</p>
                        )}
                      </div>
                      <button
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
                        style={{ background: 'var(--error)', color: '#FFFFFF' }}
                      >
                        <Square size={12} className="fill-current" /> Parar
                      </button>
                    </>
                  )
                })()}

                {stopping && (
                  <p className="py-2 text-sm" style={{ color: '#4A7580' }}>Processando gravação...</p>
                )}

                {!recording && !stopping && recordedFile && (
                  <>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'rgba(134,239,172,0.10)' }}
                    >
                      <Mic size={24} style={{ color: '#2E7D4F' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#112630' }}>
                      {formatSeconds(recordingSeconds)} &middot; {(recordedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <button
                      onClick={() => { setRecordedFile(null); setRecordingSeconds(0) }}
                      className="text-xs underline"
                      style={{ color: '#4A7580' }}
                    >
                      Gravar novamente
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {mode === 'upload' && (
              <motion.div
                key="upload-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl p-6 text-center cursor-pointer transition-all"
                style={{ border: '1px dashed var(--border-light)', background: 'var(--surface-high)' }}
                onClick={() => fileRef.current?.click()}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
              >
                <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                {uploadFile ? (
                  <p className="text-sm font-medium" style={{ color: '#112630' }}>
                    {uploadFile.name} &middot; {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto mb-2" style={{ color: '#4A7580' }} />
                    <p className="text-sm" style={{ color: '#4A7580' }}>Clique para selecionar áudio</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSave}
            disabled={!activeFile || saving}
            className="btn-gold w-full"
            style={{ justifyContent: 'center', padding: '12px' }}
          >
            {saving ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
