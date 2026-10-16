import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FaqView from '@/components/FaqView'
import { isAdminEmail } from '@/lib/user-role'
import { listFaqItems, listOpenFaqRequests } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

/* "Como faço": dados carregados no servidor, já com o papel resolvido.
   Admin recebe também as não publicadas e as perguntas abertas da rede. */
export default async function FaqPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/flow/login')
  const isAdmin = await isAdminEmail(session.user.email)
  const [items, requests] = await Promise.all([listFaqItems(isAdmin), isAdmin ? listOpenFaqRequests() : Promise.resolve([])])
  return <FaqView items={items} requests={requests} isAdmin={isAdmin} />
}
