'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { type Lang, t } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  tr: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt-BR',
  setLang: () => {},
  tr: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt-BR')

  useEffect(() => {
    const stored = localStorage.getItem('tdg-lang') as Lang | null
    if (stored && stored in t) setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('tdg-lang', l)
  }

  function tr(key: string): string {
    return t[lang][key] ?? t['pt-BR'][key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
