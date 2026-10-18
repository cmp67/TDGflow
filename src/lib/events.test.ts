import { describe, it, expect } from 'vitest'
import { parseEvent, parseWhen, eventLine, agendaMessage, brDay } from './events'

describe('parseWhen / parseEvent — agenda da rede', () => {
  it('aceita data (dia inteiro, Brasília), data e hora em Brasília, e ISO completo', () => {
    expect(parseWhen('2026-10-28')).toEqual({ iso: '2026-10-28T03:00:00.000Z', allDay: true })
    expect(parseWhen('2026-10-28 15:00')).toEqual({ iso: '2026-10-28T18:00:00.000Z', allDay: false })
    expect(parseWhen('2026-10-28T15:00:00-03:00')?.iso).toBe('2026-10-28T18:00:00.000Z')
    expect(parseWhen('amanhã')).toBeNull()
  })
  it('valida título, tipo, fim ≥ começo, link, modalidade; visibilidade padrão rede', () => {
    const ok = parseEvent({ title: ' Treinamento  Six Senses ', type: 'treinamento', starts_at: '2026-10-28 15:00', ends_at: '2026-10-28 16:00', modality: 'online', link: 'https://meet.google.com/x' })
    expect(ok).toMatchObject({ ok: true, fields: { title: 'Treinamento Six Senses', all_day: false, modality: 'online', visibility: 'rede', ends_at: '2026-10-28T19:00:00.000Z' } })
    expect(parseEvent({ title: 'ab', starts_at: '2026-10-28' }).ok).toBe(false)
    expect(parseEvent({ title: 'Feira', type: 'balada', starts_at: '2026-10-28' }).ok).toBe(false)
    expect(parseEvent({ title: 'Feira', starts_at: '2026-10-28 10:00', ends_at: '2026-10-28 09:00' }).ok).toBe(false)
    expect(parseEvent({ title: 'Feira', starts_at: '2026-10-28', link: 'meet.google.com' }).ok).toBe(false)
    expect(parseEvent({ title: 'Feira', starts_at: '2026-10-28', modality: 'hibrido' }).ok).toBe(false)
    expect(parseEvent({ title: 'Feira ILTM', starts_at: '2026-12-01', visibility: 'agencia' })).toMatchObject({ ok: true, fields: { all_day: true, visibility: 'agencia', type: 'outro' } })
  })
})

describe('formatação pro WhatsApp', () => {
  const e = { title: 'Treinamento Six Senses', type: 'treinamento' as const, starts_at: '2026-10-28T18:00:00.000Z', all_day: false, modality: 'online' as const, location: null, link: 'https://meet.google.com/x', rsvp_vou: 4 }
  it('linha com dia da semana, hora de Brasília, modalidade, confirmadas e link', () => {
    expect(eventLine(e)).toBe('qua 28/10 · 15:00 — *Treinamento Six Senses* (online) · 4 confirmadas\nhttps://meet.google.com/x')
    expect(eventLine({ ...e, all_day: true, modality: null, location: 'São Paulo', link: null, rsvp_vou: 1 })).toBe('qua 28/10 — *Treinamento Six Senses* (São Paulo) · 1 confirmada')
  })
  it('mensagem vazia devolve o texto de "nada" (ou null pra ficar calado)', () => {
    expect(agendaMessage('Agenda de amanhã', [], null)).toBeNull()
    expect(agendaMessage('Agenda de amanhã', [e], null)).toContain('*Agenda de amanhã*')
  })
  it('brDay respeita o fuso de Brasília', () => {
    expect(brDay('2026-10-28T02:30:00.000Z')).toBe('2026-10-27')
    expect(brDay('2026-10-28T03:00:00.000Z')).toBe('2026-10-28')
  })
})
