'use client'

import { useState, useRef } from 'react'
import { Mic, Upload, CheckCircle, X } from 'lucide-react'

interface AudioSummary {
  hotel_name?: string
  visit_type?: string
  commission_rate?: number
  promotions?: string[]
  advantages?: string[]
  highlights?: string[]
  notes?: string
}

interface TranscribeResult {
  id: string
  transcript: string
  summary: AudioSummary
}

export default function AudioUpload({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [agentName, setAgentName] = useState('')
  const [agency, setAgency] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [audioShared, setAudioShared] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleTranscribe() {
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('audio', file)
    fd.append('agent_name', agentName || 'Agente TDG')
    fd.append('agency', agency)
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await res.json()
    setResult(data)
    setStep('review')
    setLoading(false)
  }

  async function handleConfirm() {
    if (!result) return
    setLoading(true)
    await fetch('/api/audio-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: result.id, audio_shared: audioShared, summary: result.summary })
    })
    setStep('done')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Registar Audio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Seu nome</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Nome do agente"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Agência</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Nome da agência"
                    value={agency}
                    onChange={e => setAgency(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-2">
                    <Mic size={32} className="mx-auto text-amber-500" />
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={32} className="mx-auto text-gray-300" />
                    <p className="text-gray-500">Clique para seleccionar audio</p>
                    <p className="text-xs text-gray-400">MP3, M4A, WAV, OGG, OPUS</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleTranscribe}
                disabled={!file || loading}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'A transcrever...' : 'Transcrever e Analisar'}
              </button>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-1 font-medium">TRANSCRIÇÃO</p>
                <p className="text-sm text-gray-700">{result.transcript}</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-700 mb-2 font-semibold">RESUMO EXTRAÍDO</p>
                <div className="space-y-1 text-sm text-gray-700">
                  {result.summary.hotel_name && <p><span className="font-medium">Hotel:</span> {result.summary.hotel_name}</p>}
                  {result.summary.commission_rate && <p><span className="font-medium">Comissão:</span> {result.summary.commission_rate}%</p>}
                  {result.summary.promotions?.length ? (
                    <p><span className="font-medium">Promoções:</span> {result.summary.promotions.join(', ')}</p>
                  ) : null}
                  {result.summary.advantages?.length ? (
                    <p><span className="font-medium">Vantagens:</span> {result.summary.advantages.join(', ')}</p>
                  ) : null}
                  {result.summary.highlights?.map((h, i) => (
                    <p key={i} className="text-gray-600">• {h}</p>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer" onClick={() => setAudioShared(!audioShared)}>
                <div className={`w-10 h-6 rounded-full transition-colors ${audioShared ? 'bg-amber-500' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${audioShared ? 'translate-x-4' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Partilhar audio com a rede TDG</p>
                  <p className="text-xs text-gray-500">O resumo é sempre partilhado. O audio original é opcional.</p>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {loading ? 'A guardar...' : 'Confirmar e Guardar'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <p className="font-semibold text-gray-800">Input guardado com sucesso</p>
              <p className="text-sm text-gray-500">
                O resumo ficou disponível para toda a rede TDG.
                {audioShared ? ' O audio original também foi partilhado.' : ''}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
