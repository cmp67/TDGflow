'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/* Bottom sheet no mobile, painel lateral no desktop — mesmo padrão já usado
   na ficha do Fornecedor (HoteisView.tsx), extraído aqui pra não duplicar
   em cada modal novo. Sem isso, todo modal "nasce" bottom-sheet e fica
   estranho grudado embaixo em telas largas (achado da Carla). */
export default function ResponsiveSheet({
  onClose, children, maxWidth = 480, zIndex = 50,
}: {
  onClose: () => void
  children: ReactNode
  maxWidth?: number
  zIndex?: number
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.5)', zIndex }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 flex flex-col"
        style={{
          zIndex,
          background: 'var(--tdgflow-surface)',
          border: '1px solid var(--tdgflow-border)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          overflow: 'hidden',
          width: '100%',
          maxWidth,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle — só no mobile, no desktop o painel lateral não precisa */}
        <div className="flex md:hidden justify-center pt-3 pb-0 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--tdgflow-border)' }} />
        </div>
        {children}
      </motion.div>
    </>
  )
}
