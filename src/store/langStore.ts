import { create } from 'zustand'

interface LangState {
  lang: string
  setLang: (lang: string) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: localStorage.getItem('tayco-lang') || 'fr',
  setLang: (lang) => {
    localStorage.setItem('tayco-lang', lang)
    set({ lang })
  },
}))
