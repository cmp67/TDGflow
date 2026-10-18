'use client'
import AgendaView from '@/components/AgendaView'

/* Lança junto com o Max na uazapi (NEXT_PUBLIC_AGENDA_ENABLED=1). Antes disso a
   rota existe mas mostra só o aviso — nada de dado da rede exposto antes da hora. */
export default function AgendaPage() {
  if (process.env.NEXT_PUBLIC_AGENDA_ENABLED !== '1') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem' }}>
        A Agenda da rede chega junto com o Max. Em breve.
      </div>
    )
  }
  return <AgendaView />
}
