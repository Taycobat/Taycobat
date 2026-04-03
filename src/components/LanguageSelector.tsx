import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { languages } from '../lib/i18n'
import { useLangStore } from '../store/langStore'

export default function LanguageSelector() {
  const { lang, setLang } = useLangStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = languages.find((l) => l.code === lang) ?? languages[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm hover:bg-white/20 transition-all cursor-pointer"
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="font-medium">{current.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 min-w-[200px]"
          >
            <div className="p-2 grid grid-cols-2 gap-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code)
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                    l.code === lang
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg leading-none">{l.flag}</span>
                  <span className="truncate">{l.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
