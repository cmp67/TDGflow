import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }))
vi.mock('@vercel/postgres', () => ({ sql: vi.fn() }))

import { auth } from '@/auth'
import { get, del } from '@vercel/blob'
import { sql } from '@vercel/postgres'
import { GET } from './route'
import { hrefForPath, pathFromHref, readStoredFile, deleteStoredFile, safeFileName, fileExtension } from '@/lib/blob-files'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockGet = get as unknown as ReturnType<typeof vi.fn>
const mockDel = del as unknown as ReturnType<typeof vi.fn>
const mockSql = sql as unknown as ReturnType<typeof vi.fn>

function req(path: string) {
  return new NextRequest(`http://localhost/api/files/${path}`)
}
const params = (path: string[]) => ({ params: Promise.resolve({ path }) })

function blobResult(contentType: string, body = 'conteudo') {
  return {
    statusCode: 200,
    stream: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(body)); c.close() } }),
    headers: new Headers(),
    blob: { contentType, contentDisposition: 'inline; filename="x"', size: body.length },
  }
}

/* A rota faz no máximo duas consultas: papel do usuário e, pra pastas com
   dono, a linha que referencia o arquivo. Cada teste declara o que o banco
   devolve, na ordem. */
function dbAnswers(...answers: Array<Record<string, unknown>[]>) {
  mockSql.mockReset()
  for (const rows of answers) mockSql.mockResolvedValueOnce({ rows })
}

beforeEach(() => {
  mockAuth.mockReset()
  mockGet.mockReset()
  mockSql.mockReset()
})

describe('GET /api/files/[...path]', () => {
  it('401 sem sessão, e nem chega a tocar no arquivo', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET(req('partnership-content/ata.md'), params(['partnership-content', 'ata.md']))
    expect(res.status).toBe(401)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('entrega o arquivo privado pra quem está logado', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    dbAnswers([{ role: 'agent' }])
    mockGet.mockResolvedValueOnce(blobResult('text/markdown'))
    const res = await GET(req('partnership-content/ata.md'), params(['partnership-content', 'ata.md']))
    expect(res.status).toBe(200)
    expect(mockGet).toHaveBeenCalledWith('partnership-content/ata.md', { access: 'private' })
    expect(res.headers.get('content-type')).toBe('text/markdown')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.text()).toBe('conteudo')
  })

  it('404 quando o arquivo não existe ou o armazenamento falha (não vaza o erro)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'a@example.com' } })
    dbAnswers([{ role: 'agent' }])
    mockGet.mockResolvedValueOnce(null)
    expect((await GET(req('knowledge/x.pdf'), params(['knowledge', 'x.pdf']))).status).toBe(404)
    dbAnswers([{ role: 'agent' }])
    mockGet.mockRejectedValueOnce(new Error('BlobNotFound'))
    expect((await GET(req('knowledge/x.pdf'), params(['knowledge', 'x.pdf']))).status).toBe(404)
  })

  it('400 com caminho vazio ou com ..', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'a@example.com' } })
    expect((await GET(req(''), params([]))).status).toBe(400)
    expect((await GET(req('../secret'), params(['..', 'secret']))).status).toBe(400)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('pasta que não é de arquivo privado (foto de hotel) não sai por aqui', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    expect((await GET(req('hotels/foto.jpg'), params(['hotels', 'foto.jpg']))).status).toBe(404)
    expect(mockGet).not.toHaveBeenCalled()
  })
})

describe('quem pode ler cada pasta', () => {
  it('áudio ditado: quem gravou vê o seu; outro agente não; admin vê todos', async () => {
    const path = ['audio', 'gravacao-abc.webm']
    const href = hrefForPath(path.join('/'))

    // dono: a linha em tdg_audio_inputs aponta pro arquivo e é dele
    mockAuth.mockResolvedValueOnce({ user: { email: 'dono@example.com' } })
    dbAnswers([{ role: 'agent' }], [{ audio_url: href }])
    mockGet.mockResolvedValueOnce(blobResult('audio/webm'))
    expect((await GET(req(path.join('/')), params(path))).status).toBe(200)

    // outro agente: nenhuma linha dele referencia o arquivo
    mockAuth.mockResolvedValueOnce({ user: { email: 'outro@example.com' } })
    dbAnswers([{ role: 'agent' }], [])
    expect((await GET(req(path.join('/')), params(path))).status).toBe(403)

    // admin
    mockAuth.mockResolvedValueOnce({ user: { email: 'chefe@example.com' } })
    dbAnswers([{ role: 'admin' }])
    mockGet.mockResolvedValueOnce(blobResult('audio/webm'))
    expect((await GET(req(path.join('/')), params(path))).status).toBe(200)
  })

  it('material privado de agência: só quem é da agência (ou admin)', async () => {
    const path = ['materials', 'contrato_acordo-abc.pdf']
    const href = hrefForPath(path.join('/'))

    // material visível pra este usuário (rede ou mesma agência): a consulta acha a linha
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    dbAnswers([{ role: 'agent' }], [{ file_url: href }])
    mockGet.mockResolvedValueOnce(blobResult('application/pdf'))
    expect((await GET(req(path.join('/')), params(path))).status).toBe(200)

    // de outra agência: a consulta (que já filtra por agência) não acha nada
    mockAuth.mockResolvedValueOnce({ user: { email: 'b@example.com' } })
    dbAnswers([{ role: 'agent' }], [])
    expect((await GET(req(path.join('/')), params(path))).status).toBe(403)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('ata da parceria, conhecimento e documento de review: qualquer pessoa logada', async () => {
    for (const path of [['partnership-content', 'ata.md'], ['knowledge', 'h1', 'video.mp4'], ['reviews-docs', 'roteiro.pdf']]) {
      mockAuth.mockResolvedValueOnce({ user: { email: 'agente@example.com' } })
      dbAnswers([{ role: 'agent' }])
      mockGet.mockResolvedValueOnce(blobResult('application/octet-stream'))
      expect((await GET(req(path.join('/')), params(path))).status).toBe(200)
    }
  })

  it('nome com % não quebra (o Next já entrega decodificado)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    dbAnswers([{ role: 'agent' }])
    mockGet.mockResolvedValueOnce(blobResult('application/pdf'))
    const res = await GET(req('knowledge/relat%C3%B3rio%2050%25.pdf'), params(['knowledge', 'relatório 50%.pdf']))
    expect(res.status).toBe(200)
    expect(mockGet).toHaveBeenCalledWith('knowledge/relatório 50%.pdf', { access: 'private' })
  })
})

describe('blob-files', () => {
  it('hrefForPath / pathFromHref: ida e volta com espaço e acento', () => {
    const path = 'materials/contrato final ação.pdf'
    const href = hrefForPath(path)
    expect(href.startsWith('/api/files/')).toBe(true)
    expect(href).not.toContain(' ')
    expect(pathFromHref(href)).toBe(path)
  })

  it('href que não é do Flow devolve null', () => {
    expect(pathFromHref('https://blob.vercel-storage.com/x.pdf')).toBeNull()
  })

  it('readStoredFile lê caminho privado direto do armazenamento', async () => {
    mockGet.mockResolvedValueOnce(blobResult('audio/webm', 'bytes'))
    const buf = await readStoredFile(hrefForPath('audio/gravacao-abc.webm'))
    expect(new TextDecoder().decode(buf)).toBe('bytes')
    expect(mockGet).toHaveBeenCalledWith('audio/gravacao-abc.webm', { access: 'private' })
  })

  it('safeFileName: tira caminho, ".." e caracteres que quebram a rota, mantém extensão', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('pasta/sub/gravação final.webm')).toBe('gravacao-final.webm')
    expect(safeFileName('relatório 50%.pdf')).toBe('relatorio-50.pdf')
    expect(safeFileName('')).toBe('arquivo')
    expect(safeFileName('..')).toBe('arquivo')
  })

  it('fileExtension: só letras/números, minúscula, sem barra', () => {
    expect(fileExtension('Contrato.PDF')).toBe('pdf')
    expect(fileExtension('x/y')).toBe('bin')
    expect(fileExtension('semextensao')).toBe('bin')
    expect(fileExtension('foto.JPEG')).toBe('jpeg')
  })

  it('deleteStoredFile apaga pelo caminho quando é href privado e pela URL quando é legado', async () => {
    mockDel.mockResolvedValue(undefined)
    await deleteStoredFile(hrefForPath('audio/gravacao-abc.webm'))
    expect(mockDel).toHaveBeenLastCalledWith('audio/gravacao-abc.webm')
    await deleteStoredFile('https://x.public.blob.vercel-storage.com/audio/old.webm')
    expect(mockDel).toHaveBeenLastCalledWith('https://x.public.blob.vercel-storage.com/audio/old.webm')
  })

  it('deleteStoredFile não trava a exclusão do registro, mas deixa a falha no log', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDel.mockRejectedValueOnce(new Error('BlobServiceUnavailable'))
    await expect(deleteStoredFile(hrefForPath('partnership-content/ata-x.md'))).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })

  it('readStoredFile ainda baixa URL pública antiga por HTTP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('legado'))
    const buf = await readStoredFile('https://x.public.blob.vercel-storage.com/audio/old.webm')
    expect(new TextDecoder().decode(buf)).toBe('legado')
    expect(mockGet).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
