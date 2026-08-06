import { auth } from '@/auth'
import Chat from '@/components/Chat'

export default async function ChatPage() {
  const session = await auth()
  return <Chat fallbackName={session?.user?.name ?? null} userEmail={session?.user?.email ?? null} />
}
