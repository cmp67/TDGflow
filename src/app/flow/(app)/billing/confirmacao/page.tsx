import { Suspense } from 'react'
import SubscriptionConfirmation from '@/components/billing/SubscriptionConfirmation'

// This is the `back_url` Mercado Pago redirects the agency admin to after
// they approve (or abandon) the subscription checkout. It always polls our
// own DB for the real status — a payment's true outcome only lands via the
// async webhook, never at redirect time (see subscription-status route).
export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionConfirmation />
    </Suspense>
  )
}
