/* Arquivos do Flow (13/09/2026): o que é sensível sobe privado.

   Até esta data todo upload usava `access: 'public'` — a URL do arquivo
   abria sem login pra quem tivesse o endereço, incluindo ata de reunião,
   áudio ditado por TD e documento de review. Foto de hotel, logo e avatar
   continuam públicos: são conteúdo de vitrine e o custo de servir por rota
   autenticada não compensa.

   O que fica gravado no banco pra arquivo privado não é a URL do
   armazenamento, e sim o caminho da nossa rota autenticada (/api/files/...),
   que confere a sessão antes de devolver o conteúdo. Mesmo desenho que a
   Trip adotou em v7.128 — aqui com leitura server-side a mais, porque a
   fila de áudio baixa a gravação pra transcrever.

   URL pública antiga (anterior a 13/09) continua funcionando até a migração
   trocar cada uma pelo caminho privado. */

import { put, del, get } from '@vercel/blob'

export const FILES_ROUTE_PREFIX = '/api/files/'

export function hrefForPath(pathname: string): string {
  return FILES_ROUTE_PREFIX + pathname.split('/').map(encodeURIComponent).join('/')
}

export function pathFromHref(href: string): string | null {
  if (!href.startsWith(FILES_ROUTE_PREFIX)) return null
  return href.slice(FILES_ROUTE_PREFIX.length).split('/').map(decodeURIComponent).join('/')
}

export interface StoredFile {
  pathname: string
  href: string
}

/* Nome vindo do upload nunca entra cru no caminho: "../x" ou "a/b" viraria
   um arquivo que a rota autenticada recusa (e fica ilegível pra sempre).
   Fica só o nome-base, sem acento, com letras/números/ponto/hífen. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const ext = fileExtensionOrNull(base)
  const stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const safeStem = stem || 'arquivo'
  return ext ? `${safeStem}.${ext}` : safeStem
}

function fileExtensionOrNull(name: string): string | null {
  const m = /\.([A-Za-z0-9]{1,10})$/.exec(name)
  return m ? m[1].toLowerCase() : null
}

/* Extensão só com letras/números — "x/y" ou sem ponto vira "bin". */
export function fileExtension(name: string): string {
  return fileExtensionOrNull(name.split(/[\\/]/).pop() ?? '') ?? 'bin'
}

/* Sufixo aleatório sempre ligado: sem ele dois envios com o mesmo nome (ou
   na mesma categoria no mesmo segundo) se sobrescreviam — e o caminho
   deixa de ser adivinhável. */
export async function putPrivateFile(
  pathname: string,
  body: Parameters<typeof put>[1],
  options: { contentType?: string } = {},
): Promise<StoredFile> {
  const blob = await put(pathname, body, {
    access: 'private',
    addRandomSuffix: true,
    ...(options.contentType ? { contentType: options.contentType } : {}),
  })
  return { pathname: blob.pathname, href: hrefForPath(blob.pathname) }
}

/* Apaga o arquivo a partir do que está gravado no banco — caminho da rota
   (privado) ou URL pública antiga. Arquivo órfão nunca trava a exclusão do
   registro, mas a falha fica no log: um "apagado" que continua no
   armazenamento segue legível por quem tiver o caminho. */
export async function deleteStoredFile(hrefOrUrl: string | null): Promise<void> {
  if (!hrefOrUrl) return
  const target = pathFromHref(hrefOrUrl) ?? hrefOrUrl
  try {
    await del(target)
  } catch (err) {
    console.error('[blob-files] falha ao apagar arquivo, ficou órfão no armazenamento:', target, err)
  }
}

/* Leitura server-side (fila de áudio → transcrição). Caminho privado lê
   direto do armazenamento; URL pública antiga ainda baixa por HTTP. */
export async function readStoredFile(hrefOrUrl: string): Promise<ArrayBuffer> {
  const pathname = pathFromHref(hrefOrUrl)
  if (pathname) {
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200) {
      throw new Error(`Arquivo privado não encontrado: ${pathname}`)
    }
    return new Response(result.stream).arrayBuffer()
  }
  const resp = await fetch(hrefOrUrl)
  if (!resp.ok) throw new Error(`Falha ao baixar arquivo (${resp.status})`)
  return resp.arrayBuffer()
}
