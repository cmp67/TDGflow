import { describe, it, expect } from 'vitest'
import { isAuthorMatch } from './author-match'

describe('isAuthorMatch', () => {
  it('nome legal completo com nome do meio bate com nome parcial extraído do WhatsApp', () => {
    expect(isAuthorMatch('Elaine Scanavacca Agencia', 'Elaine Alvarenga Scanavacca')).toBe(true)
  })

  it('nome legal completo com sobrenome extra bate quando o 2º nome já aparece', () => {
    expect(isAuthorMatch('Maria Amelia Agencia', 'Maria Amelia Innecchi')).toBe(true)
  })

  it('nome exatamente igual bate', () => {
    expect(isAuthorMatch('Fernanda Helou', 'Fernanda Helou')).toBe(true)
  })

  it('nome com acento bate com versão sem acento', () => {
    expect(isAuthorMatch('Joao Silva Agencia', 'João Silva')).toBe(true)
  })

  it('só o primeiro nome batendo NÃO é suficiente — evita falso positivo entre pessoas com o mesmo primeiro nome', () => {
    expect(isAuthorMatch('Ana Consultora', 'Ana Terra')).toBe(false)
    expect(isAuthorMatch('Ana Consultora', 'Ana Roberta Stamato Perri')).toBe(false)
  })

  it('pessoa completamente diferente não bate', () => {
    expect(isAuthorMatch('Beto Nascimento Flaptur', 'Luis Sassi')).toBe(false)
  })

  it('nome de uma palavra só (raro, mas possível) basta bater sozinho', () => {
    expect(isAuthorMatch('Cher Agencia', 'Cher')).toBe(true)
  })

  it('vazio ou nulo nunca bate', () => {
    expect(isAuthorMatch('', 'Fernanda Helou')).toBe(false)
    expect(isAuthorMatch('Fernanda Helou', '')).toBe(false)
    expect(isAuthorMatch(null, 'Fernanda Helou')).toBe(false)
    expect(isAuthorMatch('Fernanda Helou', undefined)).toBe(false)
  })

  it('duas pessoas com o mesmo primeiro nome na rede real — só a certa bate', () => {
    expect(isAuthorMatch('Caroline Assad TA Travel', 'Caroline Guerreiro Rocha Cordeiro')).toBe(false)
    expect(isAuthorMatch('Caroline Assad TA Travel', 'Caroline Assad')).toBe(true)
  })
})
