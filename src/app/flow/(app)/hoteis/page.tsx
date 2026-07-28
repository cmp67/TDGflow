'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Fornecedores virou uma lente dentro do Contact Hub ("Rede"), não mais
// item próprio de menu — mantém o link antigo funcionando (bookmarks,
// referências que possam ter ficado pra trás).
function RedirectToRede() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'fornecedores')
    router.replace(`/flow/rede?${params.toString()}`)
  }, [router, searchParams])

  return null
}

export default function HoteisPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToRede />
    </Suspense>
  )
}
