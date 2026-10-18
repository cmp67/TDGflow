import { describe, it, expect } from 'vitest'
import { parseEvent, parseWhen, eventLine, agendaMessage, brDay, googleCalendarUrl, outlookCalendarUrl, buildIcs, inviteText } from './events'

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

describe('agenda pessoal e convite', () => {
  const ev = { id: 'E1', title: 'Treinamento Six Senses, Douro', starts_at: '2026-10-28T18:00:00.000Z', ends_at: '2026-10-28T19:30:00.000Z', all_day: false, modality: 'online' as const, location: null, link: 'https://meet.google.com/x', description: 'Traga dúvidas; vale Lumis.' }
  const APP = 'https://traveldesignersgroup.com.br'
  it('Google: datas em UTC, fuso de Brasília, link do Flow nos detalhes', () => {
    const u = new URL(googleCalendarUrl(ev, APP))
    expect(u.searchParams.get('dates')).toBe('20261028T180000Z/20261028T193000Z')
    expect(u.searchParams.get('ctz')).toBe('America/Sao_Paulo')
    expect(u.searchParams.get('details')).toContain(`${APP}/flow/agenda?event=E1`)
    expect(u.searchParams.get('location')).toBe('https://meet.google.com/x')
  })
  it('dia inteiro: datas sem hora, fim exclusivo no dia seguinte', () => {
    const u = new URL(googleCalendarUrl({ ...ev, all_day: true, ends_at: null, starts_at: '2026-12-01T03:00:00.000Z' }, APP))
    expect(u.searchParams.get('dates')).toBe('20261201/20261202')
  })
  it('Outlook tem início, fim e assunto', () => {
    const u = new URL(outlookCalendarUrl(ev, APP))
    expect(u.searchParams.get('subject')).toBe('Treinamento Six Senses, Douro'); expect(u.searchParams.get('startdt')).toBe(ev.starts_at)
  })
  it('.ics válido: CRLF, UID estável, texto escapado, sem fim → 1h', () => {
    const ics = buildIcs({ ...ev, ends_at: null }, APP, new Date('2026-10-18T12:00:00Z'))
    expect(ics).toContain('BEGIN:VEVENT\r\nUID:E1@tdg-flow\r\n')
    expect(ics).toContain('DTSTART:20261028T180000Z\r\nDTEND:20261028T190000Z')
    expect(ics).toContain('SUMMARY:Treinamento Six Senses\\, Douro')
    expect(ics).toContain('Traga dúvidas\; vale Lumis.')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
  it('convite: quem convidou, linha do evento e link pra confirmar', () => {
    const t = inviteText({ ...ev, type: 'treinamento' }, 'Carla', APP)
    expect(t).toContain('*Carla* te convidou para:')
    expect(t).toContain('qua 28/10 · 15:00 — *Treinamento Six Senses, Douro* (online)')
    expect(t).toContain(`${APP}/flow/agenda?event=E1`)
  })
})
