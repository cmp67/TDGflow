'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Upload, CheckCircle, X, Square, Circle } from 'lucide-react'
import InsufficientBalanceModal from './InsufficientBalanceModal'

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

type InputMode = 'record' | 'upload'

export default function AudioUpload({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'input' | 'review' | 'done'>('input')
  const [mode, setMode] = useState<InputMode>('record')
  const [file, setFile] = useState<File | null>(null)
  const [agentName, setAgentName] = useState('')
  const [agency, setAgency] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [audioShared, setAudioShared] = useState(false)

  // Recording state
  const [recording, setRecording] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
        const f = new File([blob], `gravacao-${Date.now()}.${ext}`, { type: mimeType })
        setRecordedFile(f)
        setRecording(false)
        setStopping(false)
      }
      mr.start(100)  // chunks mais frequentes para garantir que chegam antes do stop
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('Não foi possível aceder ao microfone. Verifique as permissões do browser.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    setStopping(true)
    mediaRecorderRef.current?.requestData()
    mediaRecorderRef.current?.stop()
  }

  function getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
  }

  function formatSeconds(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const activeFile = mode === 'record' ? recordedFile : file

  async function handleTranscribe() {
    if (!activeFile) return
    setLoading(true)
    const fd = new FormData()
    fd.append('audio', activeFile)
    fd.append('agent_name', agentName || 'MAX')
    fd.append('agency', agency)
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    if (res.status === 402) { setShowBalanceModal(true); setLoading(false); return }
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
      {showBalanceModal && <InsufficientBalanceModal onClose={() => setShowBalanceModal(false)} />}
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Registar Audio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-4">
              {/* Agent info */}
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

              {/* Mode selector */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setMode('record')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'record' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mic size={16} />
                  Gravar
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload size={16} />
                  Subir ficheiro
                </button>
              </div>

              {/* Record mode */}
              {mode === 'record' && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center space-y-4">
                  {!recording && !recordedFile && (
                    <>
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                        <Mic size={28} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">Clique para começar a gravar</p>
                        <p className="text-xs text-gray-400 mt-1">Site inspections, reuniões, debriefs</p>
                      </div>
                      <button
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors"
                      >
                        <Circle size={14} className="fill-white" />
                        Iniciar gravação
                      </button>
                    </>
                  )}

                  {recording && !stopping && (() => {
                    const MAX_SECONDS = 20 * 60
                    const pct = Math.min((recordingSeconds / MAX_SECONDS) * 100, 100)
                    const isWarning = recordingSeconds >= 15 * 60
                    const isCritical = recordingSeconds >= 19 * 60
                    const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-400'
                    return (
                      <>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse ${isCritical ? 'bg-red-50' : 'bg-red-50'}`}>
                          <Mic size={28} className={isCritical ? 'text-red-600' : 'text-red-500'} />
                        </div>
                        <div>
                          <p className="text-red-600 font-semibold">A gravar...</p>
                          <p className={`text-2xl font-mono mt-1 ${isCritical ? 'text-red-600' : 'text-gray-700'}`}>
                            {formatSeconds(recordingSeconds)}
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full px-2 space-y-1">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>0:00</span>
                            {isWarning && !isCritical && (
                              <span className="text-amber-500 font-medium">⚠ Menos de 5 min restantes</span>
                            )}
                            {isCritical && (
                              <span className="text-red-500 font-medium animate-pulse">⚠ Limite quase atingido — para já!</span>
                            )}
                            <span>20:00</span>
                          </div>
                        </div>

                        <button
                          onClick={stopRecording}
                          className="inline-flex items-center gap-2 bg-red-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-red-600 transition-colors"
                        >
                          <Square size={14} className="fill-white" />
                          Parar gravação
                        </button>
                      </>
                    )
                  })()}

                  {stopping && (
                    <div className="space-y-2">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto animate-spin">
                        <Mic size={28} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">A processar gravação...</p>
                    </div>
                  )}

                  {!recording && recordedFile && (
                    <>
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                        <Mic size={28} className="text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Gravação concluída</p>
                        <p className="text-sm text-gray-500">{formatSeconds(recordingSeconds)} · {(recordedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={() => { setRecordedFile(null); setRecordingSeconds(0) }}
                        className="text-sm text-gray-400 hover:text-gray-600 underline"
                      >
                        Gravar novamente
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Upload mode */}
              {mode === 'upload' && (
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
                      <p className="text-xs text-gray-400">MP3, M4A, WAV, OGG, OPUS, WEBM</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleTranscribe}
                disabled={!activeFile || loading}
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
