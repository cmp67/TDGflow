import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BR_TZ, toBrDate, monthDate } from './tz'
import { todayLine, maxCalendar } from './max/prompt'
import { todayBr } from './events-db'
import { brDay } from './events'

/* "Nunca deixe isso mudar" (Carla, 19/10/2026): o Flow vive no fuso de São
   Paulo, não importa onde o servidor ou o navegador estejam. */
describe('fuso do Flow = São Paulo', () => {
  it('constante é America/Sao_Paulo', () => expect(BR_TZ).toBe('America/Sao_Paulo'))

  it('data só-dia não volta um dia em São Paulo', () => {
    expect(toBrDate('2026-10-22').toLocaleDateString('pt-BR', { timeZone: BR_TZ })).toBe('22/10/2026')
    expect(monthDate(2026, 10).toLocaleDateString('pt-BR', { timeZone: BR_TZ, month: 'long' })).toBe('outubro')
  })

  it('23h40 de SP (02h40 UTC do dia seguinte) ainda é o mesmo dia', () => {
    const late = new Date('2026-10-20T02:40:00Z')
    expect(todayBr(late)).toBe('2026-10-19')
    expect(brDay(late)).toBe('2026-10-19')
    expect(todayLine(late)).toContain('segunda-feira, 19/10/2026, 23h40')
  })

  it('calendário do Max: a próxima quinta depois de segunda 19/10 é 22/10', () => {
    const cal = maxCalendar(new Date('2026-10-19T13:00:00Z'))
    expect(cal).toContain('qui 22/10')
    expect(cal).not.toContain('qui 23/10')
    expect(cal.startsWith('seg 19/10 (hoje)')).toBe(true)
  })

  it('nenhuma data é formatada no código sem o fuso de São Paulo', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(n) || /\.test\.tsx?$/.test(n)) continue
        const src = readFileSync(p, 'utf8')
        const re = /\.(toLocaleDateString|toLocaleTimeString|toLocaleString)\(([^)]{0,300})\)|new Intl\.DateTimeFormat\(([^)]{0,300})\)/g
        for (const m of src.matchAll(re)) {
          const args = m[2] ?? m[3] ?? ''
          const isDate = m[1] !== 'toLocaleString' || /\b(day|month|year|hour|minute|weekday)\b/.test(args)
          if (isDate && !/timeZone|\bopts\b/.test(args)) offenders.push(`${p}: ${m[0].slice(0, 80)}`)
        }
      }
    }
    walk('src')
    expect(offenders).toEqual([])
  })
})
