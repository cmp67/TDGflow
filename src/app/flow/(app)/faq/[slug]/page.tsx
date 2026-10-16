import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FaqView from '@/components/FaqView'
import { isAdminEmail } from '@/lib/user-role'
import { listFaqItems, listOpenFaqRequests } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

/* Deep-link: /flow/faq/<slug> abre a mesma tela com a pergunta aberta e
   rolada até ela. É a URL que a Carla cola no WhatsApp. Slug desconhecido
   cai na lista normal, sem erro. */
export default async function FaqItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.email) redirect('/flow/login')
  const { slug } = await params
  const isAdmin = await isAdminEmail(session.user.email)
  const [items, requests] = await Promise.all([listFaqItems(isAdmin), isAdmin ? listOpenFaqRequests() : Promise.resolve([])])
  const exists = items.some(i => i.slug === slug)
  return <FaqView items={items} requests={requests} isAdmin={isAdmin} initialSlug={exists ? slug : undefined} />
}
